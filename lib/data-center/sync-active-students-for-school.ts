import "server-only";

/**
 * Rebuilds current student visibility from the surviving committed imports.
 * Student rows are retained for historical references; only isActive changes.
 */
export async function syncActiveStudentsForSchool(db: any, schoolAccountId: string) {
  const activeCycles = await db.noorImportCycle.findMany({
    where: { schoolAccountId, isArchived: false },
    select: { id: true },
  });
  const activeCycleIds = activeCycles.map((cycle: any) => cycle.id);
  const sourceRows = await db.studentImportRow.findMany({
    where: {
      matchedStudentId: { not: null },
      session: {
        schoolAccountId,
        status: "COMMITTED",
        isArchived: false,
        cycleId: { in: activeCycleIds },
      },
    },
    select: { matchedStudentId: true },
  });

  const activeIds = Array.from(
    new Set(sourceRows.map((row: any) => row.matchedStudentId).filter((id: unknown): id is string => typeof id === "string" && id.length > 0)),
  );
  const before = await db.student.count({ where: { schoolAccountId, isActive: true } });

  const deactivateWhere = activeIds.length
    ? { schoolAccountId, isActive: true, id: { notIn: activeIds } }
    : { schoolAccountId, isActive: true };
  const deactivated = await db.student.updateMany({ where: deactivateWhere, data: { isActive: false } });

  const reactivated = activeIds.length
    ? await db.student.updateMany({ where: { schoolAccountId, id: { in: activeIds }, isActive: false }, data: { isActive: true } })
    : { count: 0 };

  const after = await db.student.count({ where: { schoolAccountId, isActive: true } });
  return { activeStudentIds: activeIds, activeStudentsBefore: before, activeStudentsAfter: after, deactivatedStudents: deactivated.count, reactivatedStudents: reactivated.count };
}
