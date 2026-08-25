import { prisma } from "@/lib/prisma";
import { writeNoorImportActivity } from "@/lib/data-center/noor-import-audit";
import { syncNoorImportCycle } from "@/lib/noor-import/noor-import-cycle-sync";

type AppTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type CommitInput = {
  sessionId: string;
  schoolAccountId: string;
  actorUserId: string;
  deactivateMissing?: boolean;
};

function compactStudentSnapshot(student: any): any {
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

export async function commitNoorImportSession({
  sessionId,
  schoolAccountId,
  actorUserId,
  deactivateMissing = false,
}: CommitInput) {
  const session = await prisma.studentImportSession.findFirst({
    where: { id: sessionId, schoolAccountId },
    include: {
      rows: {
        where: { status: "VALID" },
        orderBy: { rowIndex: "asc" },
      },
    },
  });

  if (!session) throw new Error("IMPORT_SESSION_NOT_FOUND");
  if (session.status === "COMMITTED") throw new Error("IMPORT_SESSION_ALREADY_COMMITTED");
  if (!session.rows.length) throw new Error("IMPORT_SESSION_HAS_NO_VALID_ROWS");

  const result = await prisma.$transaction(async (tx: AppTransactionClient) => {
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let deactivatedCount = 0;
    const importedStudents: Array<{ id: string; fullName: string; action: "CREATED" | "UPDATED" | "UNCHANGED" }> = [];

    const incomingNationalIds = session.rows.map((row: any) => row.nationalId).filter(Boolean) as string[];

    for (const row of session.rows) {
      if (!row.fullName?.trim()) {
        skippedCount += 1;
        await tx.studentImportRow.update({ where: { id: row.id }, data: { status: "SKIPPED", errorMessage: "لا يوجد اسم طالب/طالبة." } });
        continue;
      }

      let guardianId: string | null = null;
      if (row.guardianName?.trim()) {
        const existingGuardian = await tx.guardian.findFirst({ where: { schoolAccountId, name: row.guardianName.trim() } });
        if (existingGuardian) {
          guardianId = existingGuardian.id;
          if (row.guardianPhone && !existingGuardian.phone) {
            await tx.guardian.update({ where: { id: existingGuardian.id }, data: { phone: row.guardianPhone } });
          }
        } else {
          const createdGuardian = await tx.guardian.create({
            data: {
              schoolAccountId,
              name: row.guardianName.trim(),
              phone: row.guardianPhone || null,
              relation: "ولي أمر مستنتج من اسم الطالب",
            },
          });
          guardianId = createdGuardian.id;
        }
      }

      const existingStudent = row.nationalId
        ? await tx.student.findFirst({ where: { schoolAccountId, nationalId: row.nationalId } })
        : await tx.student.findFirst({ where: { schoolAccountId, fullName: row.fullName, grade: row.grade, classroom: row.classroom } });

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
        if (!existingStudent.isActive) await tx.student.update({ where: { id: existingStudent.id }, data: { isActive: true } });
        skippedCount += 1;
        importedStudents.push({ id: existingStudent.id, fullName: existingStudent.fullName, action: "UNCHANGED" });
        await tx.studentImportRow.update({ where: { id: row.id }, data: { status: "SKIPPED", matchedStudentId: existingStudent.id } });
        await tx.studentImportChange.create({ data: { sessionId: session.id, rowId: row.id, studentId: existingStudent.id, action: "UNCHANGED", beforeJson: compactStudentSnapshot(existingStudent), afterJson: compactStudentSnapshot(existingStudent) } });
        continue;
      }

      if (existingStudent) {
        const beforeJson = compactStudentSnapshot(existingStudent);
        const updated = await tx.student.update({ where: { id: existingStudent.id }, data: studentData });
        updatedCount += 1;
        importedStudents.push({ id: updated.id, fullName: updated.fullName, action: "UPDATED" });
        await tx.studentImportRow.update({ where: { id: row.id }, data: { status: "UPDATED", matchedStudentId: updated.id } });
        await tx.studentImportChange.create({ data: { sessionId: session.id, rowId: row.id, studentId: updated.id, action: "UPDATED", beforeJson, afterJson: compactStudentSnapshot(updated) } });
      } else {
        const created = await tx.student.create({ data: { schoolAccountId, ...studentData } });
        createdCount += 1;
        importedStudents.push({ id: created.id, fullName: created.fullName, action: "CREATED" });
        await tx.studentImportRow.update({ where: { id: row.id }, data: { status: "CREATED", matchedStudentId: created.id } });
        await tx.studentImportChange.create({ data: { sessionId: session.id, rowId: row.id, studentId: created.id, action: "CREATED", beforeJson: null as any, afterJson: compactStudentSnapshot(created) } });
      }
    }

    if (deactivateMissing && incomingNationalIds.length > 0) {
      const activeStudents = await tx.student.findMany({ where: { schoolAccountId, isActive: true } });
      const incomingSet = new Set(incomingNationalIds);
      for (const student of activeStudents.filter((item: any) => item.nationalId && !incomingSet.has(item.nationalId))) {
        const beforeJson = compactStudentSnapshot(student);
        const updated = await tx.student.update({ where: { id: student.id }, data: { isActive: false } });
        deactivatedCount += 1;
        await tx.studentImportChange.create({ data: { sessionId: session.id, rowId: null, studentId: student.id, action: "DEACTIVATED_MISSING_FROM_IMPORT", beforeJson, afterJson: compactStudentSnapshot(updated) } });
      }
    }

    const committedSession = await tx.studentImportSession.update({
      where: { id: session.id },
      data: { status: "COMMITTED", createdCount, updatedCount, skippedCount, committedAt: new Date(), committedByUserId: actorUserId },
      include: { files: true, rows: { orderBy: { rowIndex: "asc" }, take: 50 }, _count: { select: { rows: true } } },
    });

    await syncNoorImportCycle(tx, { cycleId: session.cycleId, schoolAccountId });
    return { session: committedSession, createdCount, updatedCount, skippedCount, deactivatedCount, importedStudents };
  }, { maxWait: 10000, timeout: 120000 });

  await writeNoorImportActivity({
    schoolAccountId,
    userId: actorUserId,
    event: "NOOR_IMPORT_COMMITTED",
    title: "تم استيراد بيانات الطلاب",
    description: `تم إنشاء ${result.createdCount} طالب/طالبة وتحديث ${result.updatedCount}.`,
    metadata: { sessionId, createdCount: result.createdCount, updatedCount: result.updatedCount, skippedCount: result.skippedCount, deactivatedCount: result.deactivatedCount, deactivateMissing },
  });

  return result;
}
