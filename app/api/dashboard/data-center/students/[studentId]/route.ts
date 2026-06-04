import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { writeNoorImportActivity } from "@/lib/data-center/noor-import-audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ studentId: string }> | { studentId: string };
};

async function getParams(context: RouteContext) {
  return await context.params;
}

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);
    const body = await request.json().catch(() => ({}));

    const student = await prisma.student.findFirst({
      where: {
        id: params.studentId,
        schoolAccountId: current.schoolAccountId,
      },
      include: {
        guardian: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "لم يتم العثور على الطالب." },
        { status: 404 },
      );
    }

    const fullName = clean(body.fullName);

    if (!fullName) {
      return NextResponse.json(
        { error: "اسم الطالب مطلوب." },
        { status: 400 },
      );
    }

    const guardianName = clean(body.guardianName);
    const guardianPhone = clean(body.guardianPhone);
    let guardianId: string | null = null;

    if (guardianName) {
      const existingGuardian = await prisma.guardian.findFirst({
        where: {
          schoolAccountId: current.schoolAccountId,
          name: guardianName,
        },
      });

      if (existingGuardian) {
        guardianId = existingGuardian.id;

        if (guardianPhone && guardianPhone !== existingGuardian.phone) {
          await prisma.guardian.update({
            where: {
              id: existingGuardian.id,
            },
            data: {
              phone: guardianPhone,
            },
          });
        }
      } else {
        const createdGuardian = await prisma.guardian.create({
          data: {
            schoolAccountId: current.schoolAccountId,
            name: guardianName,
            phone: guardianPhone || null,
            relation: "ولي أمر معدل يدويًا",
          },
        });

        guardianId = createdGuardian.id;
      }
    }

    const beforeJson = {
      fullName: student.fullName,
      stage: student.stage,
      grade: student.grade,
      classroom: student.classroom,
      guardianId: student.guardianId,
      guardianName: student.guardian?.name ?? null,
      guardianPhone: student.guardian?.phone ?? null,
      isActive: student.isActive,
    };

    const updated = await prisma.student.update({
      where: {
        id: student.id,
      },
      data: {
        fullName,
        stage: clean(body.stage) || null,
        grade: clean(body.grade) || null,
        classroom: clean(body.classroom) || null,
        guardianId,
        isActive: body.isActive === false ? false : true,
      },
      include: {
        guardian: true,
      },
    });

    await writeNoorImportActivity({
      schoolAccountId: current.schoolAccountId,
      userId: current.user.id,
      event: "STUDENT_MANUAL_UPDATE",
      title: "تم تعديل بيانات طالب يدويًا",
      description: `تم تعديل بيانات الطالب ${updated.fullName} من سجل الطلاب.`,
      metadata: {
        studentId: updated.id,
        beforeJson,
        afterJson: {
          fullName: updated.fullName,
          stage: updated.stage,
          grade: updated.grade,
          classroom: updated.classroom,
          guardianId: updated.guardianId,
          guardianName: updated.guardian?.name ?? null,
          guardianPhone: updated.guardian?.phone ?? null,
          isActive: updated.isActive,
        },
      },
    });

    return NextResponse.json({
      message: "تم حفظ بيانات الطالب.",
      student: {
        id: updated.id,
        fullName: updated.fullName,
        nationalId: updated.nationalId,
        gender: updated.gender,
        stage: updated.stage,
        grade: updated.grade,
        classroom: updated.classroom,
        isActive: updated.isActive,
        guardian: updated.guardian
          ? {
              id: updated.guardian.id,
              name: updated.guardian.name,
              phone: updated.guardian.phone,
              relation: updated.guardian.relation,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر حفظ بيانات الطالب.",
      },
      { status: 500 },
    );
  }
}
