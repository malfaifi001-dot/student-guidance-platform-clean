import "server-only";

import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { prisma } from "@/lib/prisma";

export const CURRICULUM_SERVICE_SLUG = "curriculum-distribution";
export const CURRICULUM_RESOURCE_TYPE = "CURRICULUM_DISTRIBUTION";

export async function listTeacherSavedCurriculum(ownerUserId: string, schoolAccountId: string, options?: { historicalPersonalRead?: boolean }) {
  const saved = await prisma.teacherSavedCurriculum.findMany({
    where: { ownerUserId, ...(options?.historicalPersonalRead ? {} : { schoolAccountId }), serviceSlug: CURRICULUM_SERVICE_SLUG },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const resolved = await Promise.all(saved.map(async (item) => ({
    id: item.id,
    subjectId: item.subjectId,
    semesterId: item.semesterId,
    createdAt: item.createdAt,
    distribution: await getDistribution(item.subjectId, item.semesterId),
  })));
  return resolved.filter((item) => item.distribution);
}

export async function saveTeacherCurriculum(input: { ownerUserId: string; schoolAccountId: string; subjectId: string; semesterId: string }) {
  const distribution = await getDistribution(input.subjectId, input.semesterId);
  if (!distribution) return { ok: false as const, code: "NOT_FOUND" as const };
  const existing = await prisma.teacherSavedCurriculum.findUnique({ where: { ownerUserId_subjectId_semesterId: { ownerUserId: input.ownerUserId, subjectId: input.subjectId, semesterId: input.semesterId } } });
  const record = existing || await prisma.teacherSavedCurriculum.create({
    data: {
      ownerUserId: input.ownerUserId,
      schoolAccountId: input.schoolAccountId,
      subjectId: input.subjectId,
      semesterId: input.semesterId,
      sortOrder: 0,
    },
  });
  return { ok: true as const, record, distribution, duplicate: Boolean(existing) };
}

export async function removeTeacherCurriculum(input: { ownerUserId: string; id: string }) {
  const result = await prisma.teacherSavedCurriculum.deleteMany({ where: { id: input.id, ownerUserId: input.ownerUserId } });
  return result.count === 1;
}
