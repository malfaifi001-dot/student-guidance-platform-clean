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

export type PrincipalStaffReport = {
  id: string;
  source: "GUIDANCE_REPORT" | "REPORT_SNAPSHOT" | "REPORT_TWO";
  title: string;
  serviceKey: string;
  serviceTitle: string;
  status: string;
  issuedAt: string;
  previewHtml: string | null;
  linkedTargetIds: string[];
};

export type PrincipalStaffReportsWorkspace = {
  staff: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    gender: "MALE" | "FEMALE" | "UNKNOWN";
    lastActivityAt: string | null;
  };
  reports: PrincipalStaffReport[];
};

export async function getPrincipalStaffReportsWorkspace(userId: string) {
  const context = await getPrincipalSchoolContext();
  if (!context.schoolAccountId || !context.schoolAccount) return null;

  const staff = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolAccountId: context.schoolAccountId,
      role: { in: PRINCIPAL_SCHOOL_MEMBER_ROLES },
    },
    select: {
      id: true,
      name: true,
      officialName: true,
      email: true,
      role: true,
      gender: true,
      sessions: {
        orderBy: { lastSeenAt: "desc" },
        take: 1,
        select: { lastSeenAt: true },
      },
    },
  });

  if (!staff) return null;

  const caseScope = {
    schoolAccountId: context.schoolAccountId,
    createdById: staff.id,
  };

  const ownedCases = await prisma.caseEntry.findMany({
    where: caseScope,
    select: { id: true },
  });
  const ownedCaseIds = ownedCases.map((item) => item.id);

  const [guidanceReports, snapshots, activeReports] = await Promise.all([
    prisma.guidanceReport.findMany({
      where: {
        caseEntryId: { in: ownedCaseIds },
        status: { in: ["GENERATED", "APPROVED", "ARCHIVED"] },
      },
      orderBy: { generatedAt: "desc" },
      select: {
        id: true,
        title: true,
        serviceSlug: true,
        status: true,
        generatedAt: true,
        approvedAt: true,
        updatedAt: true,
        renderedContent: true,
        caseEntry: { select: { service: { select: { name: true } } } },
      },
    }),
    prisma.reportSnapshot.findMany({
      where: {
        caseEntryId: { in: ownedCaseIds },
        OR: [
          { schoolAccountId: context.schoolAccountId },
          { schoolAccountId: null },
        ],
      },
      orderBy: { approvedAt: "desc" },
      select: {
        id: true,
        reportTitle: true,
        serviceSlug: true,
        serviceName: true,
        approvedAt: true,
        createdAt: true,
        snapshotHtml: true,
      },
    }),
    prisma.reportTwoActive.findMany({
      where: {
        schoolAccountId: context.schoolAccountId,
        status: "APPROVED",
        caseEntryId: { in: ownedCaseIds },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        reportTitle: true,
        serviceSlug: true,
        serviceName: true,
        status: true,
        approvedAt: true,
        updatedAt: true,
        renderedHtml: true,
      },
    }),
  ]);

  const reports: PrincipalStaffReport[] = [
    ...guidanceReports.map((report) => ({
      id: report.id,
      source: "GUIDANCE_REPORT" as const,
      title: report.title,
      serviceKey: report.serviceSlug,
      serviceTitle: report.caseEntry.service.name,
      status: report.status,
      issuedAt: (report.generatedAt || report.approvedAt || report.updatedAt).toISOString(),
      previewHtml: report.renderedContent,
      linkedTargetIds: [],
    })),
    ...snapshots.map((report) => ({
      id: report.id,
      source: "REPORT_SNAPSHOT" as const,
      title: report.reportTitle,
      serviceKey: report.serviceSlug || report.serviceName || "other",
      serviceTitle: report.serviceName || report.serviceSlug || "خدمة غير محددة",
      status: "APPROVED",
      issuedAt: (report.approvedAt || report.createdAt).toISOString(),
      previewHtml: report.snapshotHtml,
      linkedTargetIds: [],
    })),
    ...activeReports.map((report) => ({
      id: report.id,
      source: "REPORT_TWO" as const,
      title: report.reportTitle,
      serviceKey: report.serviceSlug || report.serviceName || "other",
      serviceTitle: report.serviceName || report.serviceSlug || "خدمة غير محددة",
      status: report.status,
      issuedAt: (report.approvedAt || report.updatedAt).toISOString(),
      previewHtml: report.renderedHtml,
      linkedTargetIds: [],
    })),
  ].sort((left, right) => right.issuedAt.localeCompare(left.issuedAt));

  const reportLinks = reports.length
    ? await prisma.dashboardResourceLink.findMany({
        where: {
          schoolAccountId: context.schoolAccountId,
          targetType: "PRINCIPAL_SERVICE",
          OR: reports.map((report) => ({
            sourceType:
              report.source === "REPORT_TWO"
                ? "REPORT_SNAPSHOT"
                : report.source,
            sourceId: report.id,
          })),
        },
        select: { sourceType: true, sourceId: true, targetId: true },
      })
    : [];
  const linksByReport = new Map<string, string[]>();
  for (const link of reportLinks) {
    const key = `${link.sourceType}:${link.sourceId}`;
    const targets = linksByReport.get(key) || [];
    targets.push(link.targetId);
    linksByReport.set(key, targets);
  }

  for (const report of reports) {
    const sourceType = report.source === "REPORT_TWO" ? "REPORT_SNAPSHOT" : report.source;
    report.linkedTargetIds = linksByReport.get(`${sourceType}:${report.id}`) || [];
  }

  return {
    staff: {
      id: staff.id,
      name: staff.officialName || staff.name,
      email: staff.email,
      role: staff.role,
      gender: staff.gender,
      lastActivityAt: staff.sessions[0]?.lastSeenAt.toISOString() || null,
    },
    reports,
  } satisfies PrincipalStaffReportsWorkspace;
}
