import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TimetableDataDb = typeof prisma | Prisma.TransactionClient;

/**
 * Removes only assignments whose class/subject pair is no longer present in
 * the project's curriculum. The caller can scope the check to affected
 * classes so unrelated project data is never touched.
 */
export async function cleanupOrphanTimetableAssignments(
  projectId: string,
  classIds?: string[],
  db: TimetableDataDb = prisma,
) {
  const scopedClassIds = classIds?.length ? [...new Set(classIds)] : undefined;
  const assignments = await db.timetableAssignment.findMany({
    where: {
      projectId,
      ...(scopedClassIds ? { classId: { in: scopedClassIds } } : {}),
    },
    select: { id: true, classId: true, subjectId: true },
  });

  if (!assignments.length) return 0;

  const curriculum = await db.timetableClassSubject.findMany({
    where: {
      projectId,
      ...(scopedClassIds ? { classId: { in: scopedClassIds } } : {}),
    },
    select: { classId: true, subjectId: true },
  });
  const validPairs = new Set(
    curriculum.map((item) => `${item.classId}:${item.subjectId}`),
  );
  const orphanIds = assignments
    .filter((item) => !validPairs.has(`${item.classId}:${item.subjectId}`))
    .map((item) => item.id);

  if (!orphanIds.length) return 0;

  const result = await db.timetableAssignment.deleteMany({
    where: { projectId, id: { in: orphanIds } },
  });
  return result.count;
}
