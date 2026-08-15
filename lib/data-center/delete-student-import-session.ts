import "server-only";

import { Prisma } from "@prisma/client";

import { syncNoorImportCycle } from "@/lib/noor-import/noor-import-cycle-sync";
import { prisma } from "@/lib/prisma";

export class StudentImportDeleteError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "INVALID_SESSION_ID",
    message: string,
  ) {
    super(message);
    this.name = "StudentImportDeleteError";
  }
}

export function normalizeStudentImportSessionId(value: unknown) {
  const sessionId = typeof value === "string" ? value.trim() : "";

  if (!sessionId || sessionId.length > 191 || !/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    throw new StudentImportDeleteError(
      "INVALID_SESSION_ID",
      "معرّف ملف بيانات الطلاب غير صالح.",
    );
  }

  return sessionId;
}

export async function deleteStudentImportSession(input: {
  sessionId: string;
  schoolAccountId: string;
  actorUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.studentImportSession.findFirst({
      where: {
        id: input.sessionId,
        schoolAccountId: input.schoolAccountId,
      },
      include: {
        files: true,
        _count: { select: { rows: true } },
        rows: { select: { matchedStudentId: true } },
      },
    });

    if (!session) {
      throw new StudentImportDeleteError(
        "NOT_FOUND",
        "لم يتم العثور على ملف بيانات الطلاب.",
      );
    }

    const originalFileName = session.files[0]?.fileName ?? session.title;
    const deletedAt = new Date();
    const deletedChanges = await tx.studentImportChange.deleteMany({
      where: { sessionId: session.id },
    });

    const importedStudentIds = Array.from(
      new Set(session.rows.map((row) => row.matchedStudentId).filter((id): id is string => Boolean(id))),
    );
    const retainedStudentIds = importedStudentIds.length
      ? new Set((await tx.studentImportRow.findMany({
          where: {
            matchedStudentId: { in: importedStudentIds },
            sessionId: { not: session.id },
            session: { schoolAccountId: input.schoolAccountId, status: "COMMITTED", isArchived: false },
          },
          select: { matchedStudentId: true },
        })).map((row) => row.matchedStudentId).filter((id): id is string => Boolean(id)))
      : new Set<string>();
    const studentsToDeactivate = importedStudentIds.filter((id) => !retainedStudentIds.has(id));
    const deactivatedStudents = studentsToDeactivate.length
      ? await tx.student.updateMany({
          where: { schoolAccountId: input.schoolAccountId, id: { in: studentsToDeactivate } },
          data: { isActive: false },
        })
      : { count: 0 };

    // StudentImportFile and StudentImportRow are owned by the session and cascade
    // with it. Canonical Student/Guardian records are deliberately preserved.
    await tx.studentImportSession.delete({ where: { id: session.id } });

    await syncNoorImportCycle(tx, {
      cycleId: session.cycleId,
      schoolAccountId: input.schoolAccountId,
    });

    await tx.platformActivityLog.create({
      data: {
        actorUserId: input.actorUserId,
        schoolAccountId: input.schoolAccountId,
        category: "STUDENT_DATA_IMPORT",
        action: "STUDENT_DATA_IMPORT_DELETED",
        severity: "WARNING",
        title: "حذف ملف بيانات الطلاب",
        details: {
          event: "student_data_import_deleted",
          sessionId: session.id,
          cycleId: session.cycleId,
          originalFileName,
          rowCount: session._count.rows,
          status: session.status,
          deletedImportChanges: deletedChanges.count,
          deactivatedStudents: deactivatedStudents.count,
          deletedBy: input.actorUserId,
          deletedAt: deletedAt.toISOString(),
          canonicalStudentsPreserved: true,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return {
      sessionId: session.id,
      cycleId: session.cycleId,
      originalFileName,
      rowCount: session._count.rows,
      status: session.status,
    };
  });
}
