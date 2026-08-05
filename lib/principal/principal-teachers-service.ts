import "server-only";

import { prisma } from "@/lib/prisma";
import { getPrincipalSchoolContext } from "@/lib/principal/principal-school-service";
import type { UserRole } from "@prisma/client";

const PRINCIPAL_SCHOOL_MEMBER_ROLES = [
  "TEACHER",
  "COUNSELOR",
  "ACTIVITY_LEADER",
] satisfies UserRole[];

export type PrincipalTeacherCardData = {
  id: string;
  fullName: string;
  email: string;
  role: "TEACHER" | "COUNSELOR" | "ACTIVITY_LEADER";
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  isActive: boolean;
  reportsCount: number;
  evidenceCount: number;
  lastActivityAt: string | null;
};

async function querySchoolTeachers(schoolAccountId: string) {
  const teachers = await prisma.user.findMany({
    where: {
      schoolAccountId,
      role: { in: PRINCIPAL_SCHOOL_MEMBER_ROLES },
    },
    orderBy: [{ isActive: "desc" }, { officialName: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      officialName: true,
      email: true,
      role: true,
      gender: true,
      isActive: true,
      sessions: {
        orderBy: { lastSeenAt: "desc" },
        take: 1,
        select: { lastSeenAt: true },
      },
      _count: {
        select: {
          caseEvidences: {
            where: { caseEntry: { schoolAccountId } },
          },
        },
      },
    },
  });

  const caseEntries = teachers.length
    ? await prisma.caseEntry.findMany({
        where: {
          schoolAccountId,
          createdById: { in: teachers.map((teacher) => teacher.id) },
        },
        select: {
          id: true,
          createdById: true,
          guidanceReports: { select: { id: true } },
          _count: { select: { evidences: true } },
        },
      })
    : [];
  const caseOwnerById = new Map(
    caseEntries.map((caseEntry) => [caseEntry.id, caseEntry.createdById]),
  );
  const reportTwoCaseIds = caseEntries.map((caseEntry) => caseEntry.id);
  const [activeReports, reportSnapshots] = reportTwoCaseIds.length
    ? await Promise.all([
        prisma.reportTwoActive.findMany({
          where: { schoolAccountId, caseEntryId: { in: reportTwoCaseIds } },
          select: { id: true, caseEntryId: true },
        }),
        prisma.reportSnapshot.findMany({
          where: {
            caseEntryId: { in: reportTwoCaseIds },
            OR: [{ schoolAccountId }, { schoolAccountId: null }],
          },
          select: { id: true, caseEntryId: true },
        }),
      ])
    : [[], []];
  const reportIdsByUserId = new Map<string, Set<string>>();
  const caseEvidenceCountByUserId = new Map<string, number>();

  for (const caseEntry of caseEntries) {
    if (!caseEntry.createdById) continue;
    const reportIds = reportIdsByUserId.get(caseEntry.createdById) ?? new Set();
    for (const report of caseEntry.guidanceReports) {
      reportIds.add(`guidance:${report.id}`);
    }
    reportIdsByUserId.set(caseEntry.createdById, reportIds);
    caseEvidenceCountByUserId.set(
      caseEntry.createdById,
      (caseEvidenceCountByUserId.get(caseEntry.createdById) ?? 0) +
        caseEntry._count.evidences,
    );
  }
  for (const report of [...activeReports, ...reportSnapshots]) {
    const ownerId = caseOwnerById.get(report.caseEntryId);
    if (!ownerId) continue;
    const reportIds = reportIdsByUserId.get(ownerId) ?? new Set();
    reportIds.add(`report-two:${report.id}`);
    reportIdsByUserId.set(ownerId, reportIds);
  }

  return teachers.map((teacher): PrincipalTeacherCardData => ({
    id: teacher.id,
    fullName: teacher.officialName || teacher.name,
    email: teacher.email,
    role: teacher.role as PrincipalTeacherCardData["role"],
    gender: teacher.gender,
    isActive: teacher.isActive,
    // All supported report records inherit ownership from CaseEntry.createdById.
    reportsCount: reportIdsByUserId.get(teacher.id)?.size ?? 0,
    // Evidence belongs to a creator-owned case; CaseEvidence has direct uploader ownership.
    evidenceCount:
      (caseEvidenceCountByUserId.get(teacher.id) ?? 0) +
      teacher._count.caseEvidences,
    lastActivityAt: teacher.sessions[0]?.lastSeenAt.toISOString() ?? null,
  }));
}

export async function getPrincipalSchoolTeachers() {
  const context = await getPrincipalSchoolContext();
  if (!context.schoolAccountId || !context.schoolAccount) return [];
  return querySchoolTeachers(context.schoolAccountId);
}

export async function getPrincipalTeachersOverview() {
  const context = await getPrincipalSchoolContext();
  if (!context.schoolAccountId || !context.schoolAccount) {
    return {
      linked: false as const,
      school: null,
      teachers: [] as PrincipalTeacherCardData[],
    };
  }

  const teachers = await querySchoolTeachers(context.schoolAccountId);
  return {
    linked: true as const,
    school: {
      name: context.schoolAccount.profile?.schoolName || context.schoolAccount.name,
      statisticalNumber:
        context.schoolAccount.profile?.schoolStatisticalNumber || null,
    },
    teachers,
  };
}
