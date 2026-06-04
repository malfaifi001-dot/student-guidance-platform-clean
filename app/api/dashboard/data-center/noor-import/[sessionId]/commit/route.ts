import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { writeNoorImportActivity } from "@/lib/data-center/noor-import-audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

async function getParams(context: RouteContext) {
  return await context.params;
}

function compactStudentSnapshot(student: any): Prisma.InputJsonValue {
  return {
    id: student.id,
    fullName: student.fullName,
    nationalId: student.nationalId,
    gender: student.gender,
    stage: student.stage,
    grade: student.grade,
    classroom: student.classroom,
    guardianId: student.guardianId,
    isActive: student.isActive,
  };
}

async function readRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);
    const body = await readRequestBody(request);

    const deactivateMissing = body?.deactivateMissing === true;
    const sessionId = params.sessionId;

    const session = await prisma.studentImportSession.findFirst({
      where: {
        id: sessionId,
        schoolAccountId: current.schoolAccountId,
      },
      include: {
        rows: {
          where: {
            status: "VALID",
          },
          orderBy: {
            rowIndex: "asc",
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "لم يتم العثور على جلسة الاستيراد." },
        { status: 404 },
      );
    }

    if (session.status === "COMMITTED") {
      return NextResponse.json(
        { error: "تم اعتماد هذه الجلسة مسبقًا ولا يمكن اعتمادها مرة أخرى." },
        { status: 409 },
      );
    }

    if (!session.rows.length) {
      return NextResponse.json(
        { error: "لا توجد صفوف صالحة للاعتماد في هذه الجلسة." },
        { status: 422 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let deactivatedCount = 0;

      const incomingNationalIds = session.rows
        .map((row) => row.nationalId)
        .filter(Boolean) as string[];

      for (const row of session.rows) {
        if (!row.fullName?.trim()) {
          skippedCount += 1;

          await tx.studentImportRow.update({
            where: { id: row.id },
            data: {
              status: "SKIPPED",
              errorMessage: "تم تجاوز الصف لعدم وجود اسم طالب/طالبة.",
            },
          });

          continue;
        }

        let guardianId: string | null = null;

        if (row.guardianName?.trim()) {
          const existingGuardian = await tx.guardian.findFirst({
            where: {
              schoolAccountId: current.schoolAccountId,
              name: row.guardianName.trim(),
            },
          });

          if (existingGuardian) {
            guardianId = existingGuardian.id;

            if (row.guardianPhone && !existingGuardian.phone) {
              await tx.guardian.update({
                where: { id: existingGuardian.id },
                data: {
                  phone: row.guardianPhone,
                },
              });
            }
          } else {
            const createdGuardian = await tx.guardian.create({
              data: {
                schoolAccountId: current.schoolAccountId,
                name: row.guardianName.trim(),
                phone: row.guardianPhone || null,
                relation: "ولي أمر مستنتج من اسم الطالب",
              },
            });

            guardianId = createdGuardian.id;
          }
        }

        const existingStudent = row.nationalId
          ? await tx.student.findFirst({
              where: {
                schoolAccountId: current.schoolAccountId,
                nationalId: row.nationalId,
              },
            })
          : await tx.student.findFirst({
              where: {
                schoolAccountId: current.schoolAccountId,
                fullName: row.fullName,
                grade: row.grade,
                classroom: row.classroom,
              },
            });

        const studentData = {
          fullName: row.fullName,
          nationalId: row.nationalId || null,
          gender: row.gender,
          stage: row.stage || null,
          grade: row.grade || null,
          classroom: row.classroom || null,
          guardianId,
          isActive: true,
        };

        if (existingStudent && row.planAction === "UNCHANGED") {
          skippedCount += 1;

          await tx.studentImportRow.update({
            where: { id: row.id },
            data: {
              status: "SKIPPED",
              matchedStudentId: existingStudent.id,
            },
          });

          await tx.studentImportChange.create({
            data: {
              sessionId: session.id,
              rowId: row.id,
              studentId: existingStudent.id,
              action: "UNCHANGED",
              beforeJson: compactStudentSnapshot(existingStudent),
              afterJson: compactStudentSnapshot(existingStudent),
            },
          });

          continue;
        }

        if (existingStudent) {
          const beforeJson = compactStudentSnapshot(existingStudent);

          const updated = await tx.student.update({
            where: { id: existingStudent.id },
            data: studentData,
          });

          updatedCount += 1;

          await tx.studentImportRow.update({
            where: { id: row.id },
            data: {
              status: "UPDATED",
              matchedStudentId: updated.id,
            },
          });

          await tx.studentImportChange.create({
            data: {
              sessionId: session.id,
              rowId: row.id,
              studentId: updated.id,
              action: "UPDATED",
              beforeJson,
              afterJson: compactStudentSnapshot(updated),
            },
          });
        } else {
          const created = await tx.student.create({
            data: {
              schoolAccountId: current.schoolAccountId,
              ...studentData,
            },
          });

          createdCount += 1;

          await tx.studentImportRow.update({
            where: { id: row.id },
            data: {
              status: "CREATED",
              matchedStudentId: created.id,
            },
          });

          await tx.studentImportChange.create({
            data: {
              sessionId: session.id,
              rowId: row.id,
              studentId: created.id,
              action: "CREATED",
              beforeJson: Prisma.JsonNull,
              afterJson: compactStudentSnapshot(created),
            },
          });
        }
      }

      if (deactivateMissing && incomingNationalIds.length > 0) {
        const activeStudents = await tx.student.findMany({
          where: {
            schoolAccountId: current.schoolAccountId,
            isActive: true,
          },
        });

        const incomingSet = new Set(incomingNationalIds);

        const missingStudents = activeStudents.filter((student) => {
          return student.nationalId && !incomingSet.has(student.nationalId);
        });

        for (const student of missingStudents) {
          const beforeJson = compactStudentSnapshot(student);

          const updated = await tx.student.update({
            where: { id: student.id },
            data: {
              isActive: false,
            },
          });

          deactivatedCount += 1;

          await tx.studentImportChange.create({
            data: {
              sessionId: session.id,
              rowId: null,
              studentId: student.id,
              action: "DEACTIVATED_MISSING_FROM_IMPORT",
              beforeJson,
              afterJson: compactStudentSnapshot(updated),
            },
          });
        }
      }

      const committedSession = await tx.studentImportSession.update({
        where: { id: session.id },
        data: {
          status: "COMMITTED",
          createdCount,
          updatedCount,
          skippedCount,
          committedAt: new Date(),
          committedByUserId: current.user.id,
        },
        include: {
          files: true,
          rows: {
            orderBy: { rowIndex: "asc" },
            take: 50,
          },
          _count: {
            select: { rows: true },
          },
        },
      });

      return {
        session: committedSession,
        createdCount,
        updatedCount,
        skippedCount,
        deactivatedCount,
      };
    });

    await writeNoorImportActivity({
      schoolAccountId: current.schoolAccountId,
      userId: current.user.id,
      event: "NOOR_IMPORT_COMMITTED",
      title: "تم اعتماد استيراد بيانات نور",
      description: `تم إنشاء ${result.createdCount} طالب/طالبة وتحديث ${result.updatedCount} وتعطيل ${result.deactivatedCount} غير موجودين في الملف الجديد.`,
      metadata: {
        sessionId,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        deactivatedCount: result.deactivatedCount,
        deactivateMissing,
      },
    });

    return NextResponse.json({
      message: "تم اعتماد بيانات نور وربط الطلاب وأولياء الأمور بالمدرسة.",
      deactivatedCount: result.deactivatedCount,
      session: {
        ...result.session,
        rowCount: result.session._count.rows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message === "UNAUTHENTICATED_SCHOOL_USER"
              ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة قبل اعتماد بيانات نور."
              : error.message
            : "تعذر اعتماد جلسة الاستيراد.",
      },
      { status: 500 },
    );
  }
}
