import { prisma } from "@/lib/prisma";
import type { NoorStudentRow } from "@/lib/noor/excel-parser";

export async function ensureDefaultSchoolAccount(): Promise<never> {
  throw new Error(
    "ensureDefaultSchoolAccount ممنوعة في مسارات الإنتاج. مرّر schoolAccountId الخاص بالمستخدم الحالي."
  );
}

type CreateStudentImportSessionParams = {
  schoolAccountId: string;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
  rows: NoorStudentRow[];
};

type CommitStudentImportSessionParams = {
  schoolAccountId: string;
  sessionId: string;
};

function assertSchoolAccountId(schoolAccountId?: string | null) {
  if (!schoolAccountId) {
    throw new Error("لا يمكن تنفيذ العملية بدون ربط المستخدم بمدرسة.");
  }

  return schoolAccountId;
}

export async function createStudentImportSession(
  params: CreateStudentImportSessionParams
) {
  const schoolAccountId = assertSchoolAccountId(params.schoolAccountId);

  const school = await prisma.schoolAccount.findUnique({
    where: {
      id: schoolAccountId,
    },
    select: {
      id: true,
    },
  });

  if (!school) {
    throw new Error("المدرسة غير موجودة.");
  }

  const validRows = params.rows.filter((row) => row.fullName?.trim().length > 2);
  const invalidRows = params.rows.length - validRows.length;

  const session = await prisma.studentImportSession.create({
    data: {
      schoolAccountId,
      title: `دفعة استيراد - ${new Date().toLocaleDateString("ar-SA")}`,
      status: "PARSED",
      totalRows: params.rows.length,
      validRows: validRows.length,
      invalidRows,
      files: {
        create: {
          fileName: params.fileName,
          mimeType: params.mimeType,
          size: params.size ?? null,
          rowCount: params.rows.length,
        },
      },
      rows: {
        create: params.rows.map((row, index) => ({
          rowIndex: index + 1,
          status: row.fullName?.trim().length > 2 ? "VALID" : "INVALID",
          fullName: row.fullName || "بدون اسم",
          nationalId: row.nationalId || null,
          gender: row.gender ?? "UNKNOWN",
          stage: row.stage || null,
          grade: row.grade || null,
          classroom: row.classroom || null,
          guardianName: row.guardianName || null,
          guardianPhone: row.guardianPhone || null,
          errorMessage:
            row.fullName?.trim().length > 2
              ? null
              : "اسم الطالب مفقود أو غير صالح",
          rawJson: row,
        })),
      },
    },
  });

  return session;
}

export async function commitStudentImportSession(
  params: CommitStudentImportSessionParams
) {
  const schoolAccountId = assertSchoolAccountId(params.schoolAccountId);

  const session = await prisma.studentImportSession.findFirst({
    where: {
      id: params.sessionId,
      schoolAccountId,
    },
    include: {
      rows: true,
    },
  });

  if (!session) {
    throw new Error("دفعة الاستيراد غير موجودة أو لا تملك صلاحية الوصول إليها.");
  }

  if (session.status === "COMMITTED") {
    throw new Error("هذه الدفعة تم اعتمادها مسبقًا.");
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let conflictCount = 0;

  for (const row of session.rows) {
    if (row.status !== "VALID") {
      skippedCount++;
      continue;
    }

    const existingStudent = row.nationalId
      ? await prisma.student.findFirst({
          where: {
            schoolAccountId,
            nationalId: row.nationalId,
          },
        })
      : null;

    let guardianId: string | undefined;

    if (row.guardianName || row.guardianPhone) {
      const guardian = await prisma.guardian.create({
        data: {
          schoolAccountId,
          name: row.guardianName || "ولي أمر غير محدد",
          phone: row.guardianPhone || null,
          relation: "ولي أمر",
        },
      });

      guardianId = guardian.id;
    }

    if (existingStudent) {
      await prisma.student.update({
        where: {
          id: existingStudent.id,
        },
        data: {
          fullName: row.fullName,
          gender: row.gender,
          stage: row.stage,
          grade: row.grade,
          classroom: row.classroom,
          guardianId,
          isActive: true,
        },
      });

      await prisma.studentImportRow.update({
        where: {
          id: row.id,
        },
        data: {
          status: "UPDATED",
          matchedStudentId: existingStudent.id,
        },
      });

      updatedCount++;
    } else {
      const student = await prisma.student.create({
        data: {
          schoolAccountId,
          guardianId,
          fullName: row.fullName,
          nationalId: row.nationalId,
          gender: row.gender,
          stage: row.stage,
          grade: row.grade,
          classroom: row.classroom,
        },
      });

      await prisma.studentImportRow.update({
        where: {
          id: row.id,
        },
        data: {
          status: "CREATED",
          matchedStudentId: student.id,
        },
      });

      createdCount++;
    }
  }

  return prisma.studentImportSession.update({
    where: {
      id: session.id,
    },
    data: {
      status: "COMMITTED",
      createdCount,
      updatedCount,
      skippedCount,
      conflictCount,
      committedAt: new Date(),
    },
  });
}
