import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { syncActiveStudentsForSchool } from "@/lib/data-center/sync-active-students-for-school";

export class StudentDataCycleDeleteError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "INVALID_CYCLE_ID",
    message: string,
  ) {
    super(message);
    this.name = "StudentDataCycleDeleteError";
  }
}

export function normalizeStudentDataCycleId(value: unknown) {
  const cycleId = typeof value === "string" ? value.trim() : "";

  if (!cycleId || cycleId.length > 191 || !/^[A-Za-z0-9_-]+$/.test(cycleId)) {
    throw new StudentDataCycleDeleteError(
      "INVALID_CYCLE_ID",
      "معرّف بطاقة بيانات الطلاب غير صالح.",
    );
  }

  return cycleId;
}

export async function deleteStudentDataCycle(input: {
  cycleId: string;
  schoolAccountId: string;
  actorUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const cycle = await tx.noorImportCycle.findFirst({
      where: {
        id: input.cycleId,
        schoolAccountId: input.schoolAccountId,
      },
    });

    if (!cycle) {
      throw new StudentDataCycleDeleteError(
        "NOT_FOUND",
        "لم يتم العثور على بطاقة بيانات الطلاب.",
      );
    }

    const sessions = await tx.studentImportSession.findMany({
      where: {
        cycleId: cycle.id,
        schoolAccountId: input.schoolAccountId,
      },
      select: {
        id: true,
        totalRows: true,
        files: { select: { id: true } },
        _count: { select: { rows: true } },
        rows: { select: { matchedStudentId: true } },
      },
    });

    const sessionIds = sessions.map((session) => session.id);
    const rowCount = sessions.reduce(
      (total, session) => total + session._count.rows,
      0,
    );
    const fileMetadataCount = sessions.reduce(
      (total, session) => total + session.files.length,
      0,
    );

    const deletedChanges = sessionIds.length
      ? await tx.studentImportChange.deleteMany({
          where: { sessionId: { in: sessionIds } },
        })
      : { count: 0 };

    // Sessions own their staging rows and file metadata through database cascades.
    // Canonical students, cases, reports, snapshots, and evidence are intentionally
    // outside this delete graph and must remain available as historical records.
    if (sessionIds.length) {
      await tx.studentImportSession.deleteMany({
        where: {
          id: { in: sessionIds },
          schoolAccountId: input.schoolAccountId,
        },
      });
    }

    await tx.noorImportCycle.delete({ where: { id: cycle.id } });

    const visibility = await syncActiveStudentsForSchool(tx, input.schoolAccountId);

    const deletedAt = new Date();
    await tx.platformActivityLog.create({
      data: {
        actorUserId: input.actorUserId,
        schoolAccountId: input.schoolAccountId,
        category: "STUDENT_DATA_IMPORT",
        action: "STUDENT_DATA_CARD_DELETED",
        severity: "WARNING",
        title: "حذف بطاقة بيانات الطلاب",
        details: {
          event: "student_data_card_deleted",
          cycleId: cycle.id,
          title: cycle.title,
          academicYear: cycle.academicYear,
          term: cycle.term,
          studentCount: cycle.totalStudents,
          deletedSessions: sessionIds.length,
          deletedRows: rowCount,
          deletedFileMetadata: fileMetadataCount,
          deletedImportChanges: deletedChanges.count,
          deactivatedStudents: visibility.deactivatedStudents,
          activeStudentsBefore: visibility.activeStudentsBefore,
          activeStudentsAfter: visibility.activeStudentsAfter,
          reactivatedStudents: visibility.reactivatedStudents,
          deletedBy: input.actorUserId,
          deletedAt: deletedAt.toISOString(),
          canonicalStudentsPreserved: true,
          historicalCasesPreserved: true,
          historicalReportsPreserved: true,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return {
      cycleId: cycle.id,
      title: cycle.title,
      academicYear: cycle.academicYear,
      term: cycle.term,
      studentCount: cycle.totalStudents,
      deletedSessions: sessionIds.length,
      deletedRows: rowCount,
    };
  });
}
