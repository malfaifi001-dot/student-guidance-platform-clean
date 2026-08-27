import "server-only";

import { prisma } from "@/lib/prisma";
import { getPrincipalSchoolContext } from "@/lib/principal/principal-school-service";
import type { UserRole } from "@prisma/client";
import { ReportSignatureRequestStatus } from "@prisma/client";
import { isPrincipalStaffReportSigned } from "@/lib/principal/principal-report-signature-service";
import { resolvePrincipalSignatureForReport } from "@/lib/report-signatures/principal-signature-resolver";
import {
  hasStructuredPrincipalSignature,
  isPrincipalSignaturePresent,
} from "@/lib/report-signatures/principal-signature-state";

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
          guidanceReports: {
            where: { status: { in: ["APPROVED", "ARCHIVED"] }, approvedAt: { not: null } },
            select: { id: true },
          },
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
          where: { schoolAccountId, status: "APPROVED", approvedAt: { not: null }, caseEntryId: { in: reportTwoCaseIds } },
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
  const snapshotCaseIds = new Set(reportSnapshots.map((report) => report.caseEntryId));
  for (const report of reportSnapshots) {
    const ownerId = caseOwnerById.get(report.caseEntryId);
    if (!ownerId) continue;
    const reportIds = reportIdsByUserId.get(ownerId) ?? new Set();
    reportIds.add(`report-two:${report.id}`);
    reportIdsByUserId.set(ownerId, reportIds);
  }
  // An approved Report2 active row and its immutable snapshot are one
  // lifecycle. The snapshot is the canonical principal-facing record.
  for (const report of activeReports) {
    if (snapshotCaseIds.has(report.caseEntryId)) continue;
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
  principalSignatureSigned: boolean;
  principalSignatureSource: "SCHOOL_IDENTITY" | "SIGN_LINK" | "PRINCIPAL_DASHBOARD" | null;
  principalSignatureDebug: PrincipalSignatureDebugInfo;
};

export type PrincipalSignatureDebugInfo = {
  resolverStatus: "SIGNED" | "UNSIGNED";
  resolverSource: "SCHOOL_IDENTITY" | "SIGN_LINK" | "PRINCIPAL_DASHBOARD" | null;
  isPersistent: boolean;
  hasSignatureUrl: boolean;
  signedAt: string | null;
  signedById: string | null;
  hasSchoolIdentitySignature: boolean;
  hasSignedLinkSignature: boolean;
  hasDashboardSignature: boolean;
  renderedHtmlHasPrincipalSlot: boolean;
  sourcePayloadHasPrincipalSignature: boolean;
};

function buildPrincipalSignatureDebug(input: {
  report: {
    principalSignatureUrl?: string | null;
    principalSignatureSignedAt?: Date | null;
    principalSignatureSignedById?: string | null;
  };
  schoolIdentity: { principalSignatureUrl: string | null; principalSignatureSignedAt: Date | null };
  signedLink?: { status?: string | null; signedAt?: Date | null; signatureUrl?: string | null } | null;
  reusePolicy?: "ALL_STAFF" | "SELECTED_STAFF" | "MANUAL_ONLY" | null;
  reportOwner?: { id: string; schoolAccountId?: string | null; role?: string | null } | null;
  selectedStaffAuthorized?: boolean;
  sourcePayload?: unknown;
  approvedHtml?: string | null;
}): PrincipalSignatureDebugInfo {
  const resolved = resolvePrincipalSignatureForReport({
    schoolIdentity: input.schoolIdentity,
    signLink: input.signedLink,
    principalDashboard: input.report,
    reusePolicy: input.reusePolicy,
    reportOwner: input.reportOwner,
    selectedStaffAuthorized: input.selectedStaffAuthorized,
  });
  const hasSignedLinkSignature = Boolean(
    input.signedLink?.status === ReportSignatureRequestStatus.SIGNED &&
      input.signedLink.signedAt &&
      input.signedLink.signatureUrl,
  );

  return {
    resolverStatus: resolved.status,
    resolverSource: resolved.source,
    isPersistent: resolved.isPersistent,
    hasSignatureUrl: Boolean(resolved.signatureUrl),
    signedAt: resolved.signedAt?.toISOString() || null,
    signedById: resolved.signedById,
    hasSchoolIdentitySignature: Boolean(input.schoolIdentity.principalSignatureUrl?.trim()),
    hasSignedLinkSignature,
    hasDashboardSignature: Boolean(
      input.report.principalSignatureUrl?.trim() && input.report.principalSignatureSignedAt,
    ),
    renderedHtmlHasPrincipalSlot: /data-report-signature-role\s*=\s*["']principal["']/i.test(
      input.approvedHtml || "",
    ),
    sourcePayloadHasPrincipalSignature: hasStructuredPrincipalSignature(input.sourcePayload),
  };
}

function getPersistedSnapshotSignatureState(input: {
  report: {
    principalSignatureUrl?: string | null;
    principalSignatureSignedAt?: Date | null;
  };
  signedRequest?: { status: ReportSignatureRequestStatus; signedAt: Date | null; signatureUrl: string | null } | null;
  schoolSignatureUrl: string | null;
  snapshotPayload: unknown;
  snapshotHtml: string | null;
}) {
  const signed = isPrincipalSignaturePresent({
    source: "REPORT_SNAPSHOT",
    report: input.report,
    signedRequest: input.signedRequest,
    signatureUrl: input.schoolSignatureUrl,
    structuredPayload: input.snapshotPayload,
    approvedHtml: input.snapshotHtml,
  });

  if (!signed) return { signed: false, source: null as PrincipalStaffReport["principalSignatureSource"] };
  if (input.signedRequest?.status === ReportSignatureRequestStatus.SIGNED) {
    return { signed: true, source: "SIGN_LINK" as const };
  }
  if (input.report.principalSignatureUrl && input.report.principalSignatureSignedAt) {
    return { signed: true, source: "PRINCIPAL_DASHBOARD" as const };
  }
  return { signed: true, source: "SCHOOL_IDENTITY" as const };
}

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

  const schoolIdentity = {
    schoolAccountId: context.schoolAccountId,
    principalSignatureUrl: context.schoolAccount.profile?.principalSignatureUrl || null,
    principalSignatureSignedAt: context.schoolAccount.profile?.principalSignatureSignedAt || null,
  };
  const reusePolicy = context.schoolAccount.profile?.principalSignatureReusePolicy || "MANUAL_ONLY";

  const caseScope = {
    schoolAccountId: context.schoolAccountId,
    createdById: staff.id,
  };

  const ownedCases = await prisma.caseEntry.findMany({
    where: caseScope,
    select: { id: true },
  });
  const ownedCaseIds = ownedCases.map((item) => item.id);
  const selectedStaffAuthorization = await prisma.principalSignatureReuseAuthorization.findUnique({
    where: {
      schoolAccountId_userId: {
        schoolAccountId: context.schoolAccountId,
        userId: staff.id,
      },
    },
    select: { id: true },
  });
  const signatureResolverContext = {
    reusePolicy,
    reportOwner: { id: staff.id, schoolAccountId: context.schoolAccountId, role: staff.role },
    selectedStaffAuthorized: Boolean(selectedStaffAuthorization),
  };

  const [guidanceReports, snapshots, activeReports] = await Promise.all([
    prisma.guidanceReport.findMany({
      where: {
        caseEntryId: { in: ownedCaseIds },
        // The principal workspace is a finalized-report inbox. GENERATED is
        // only issued/prepared content and must not appear until approved.
        status: { in: ["APPROVED", "ARCHIVED"] },
        approvedAt: { not: null },
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
        reportDataSnapshot: true,
        principalSignatureUrl: true,
        principalSignatureSignedAt: true,
        principalSignatureSignedById: true,
        signatureRequests: { where: { status: ReportSignatureRequestStatus.SIGNED, signedAt: { not: null }, signatureUrl: { not: null } }, orderBy: { signedAt: "desc" }, take: 1, select: { status: true, signedAt: true, signatureUrl: true } },
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
        caseEntryId: true,
        reportTitle: true,
        serviceSlug: true,
        serviceName: true,
        approvedAt: true,
        createdAt: true,
        snapshotHtml: true,
        snapshotPayload: true,
        principalSignatureUrl: true,
        principalSignatureSignedAt: true,
        principalSignatureSignedById: true,
      },
    }),
    prisma.reportTwoActive.findMany({
      where: {
        schoolAccountId: context.schoolAccountId,
        status: "APPROVED",
        approvedAt: { not: null },
        caseEntryId: { in: ownedCaseIds },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        caseEntryId: true,
        reportTitle: true,
        serviceSlug: true,
        serviceName: true,
        status: true,
        approvedAt: true,
        updatedAt: true,
        renderedHtml: true,
        sourcePayload: true,
        principalSignatureUrl: true,
        principalSignatureSignedAt: true,
        principalSignatureSignedById: true,
        signatureRequests: { where: { status: ReportSignatureRequestStatus.SIGNED, signedAt: { not: null }, signatureUrl: { not: null } }, orderBy: { signedAt: "desc" }, take: 1, select: { status: true, signedAt: true, signatureUrl: true } },
      },
    }),
  ]);

  const snapshotCaseIds = new Set(snapshots.map((report) => report.caseEntryId));
  // A case has one principal-facing approved Report2 representation: its
  // latest immutable snapshot. Older snapshots remain untouched in storage.
  const latestSnapshotByCaseId = new Map<string, (typeof snapshots)[number]>();
  for (const snapshot of snapshots) {
    if (!latestSnapshotByCaseId.has(snapshot.caseEntryId)) {
      latestSnapshotByCaseId.set(snapshot.caseEntryId, snapshot);
    }
  }
  const canonicalSnapshots = Array.from(latestSnapshotByCaseId.values());
  const signedRequestByCaseId = new Map(
    activeReports
      .map((report) => [report.caseEntryId, report.signatureRequests[0]] as const)
      .filter((entry) => Boolean(entry[1])),
  );
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
      principalSignatureSigned: isPrincipalStaffReportSigned({ source: "GUIDANCE_REPORT", report, signedRequest: report.signatureRequests[0], signatureUrl: schoolIdentity.principalSignatureUrl, structuredPayload: report.reportDataSnapshot, approvedHtml: report.renderedContent, ...signatureResolverContext }),
      principalSignatureSource: resolvePrincipalSignatureForReport({ schoolIdentity, signLink: report.signatureRequests[0], principalDashboard: report, ...signatureResolverContext }).source,
      principalSignatureDebug: buildPrincipalSignatureDebug({ report, schoolIdentity, signedLink: report.signatureRequests[0], sourcePayload: report.reportDataSnapshot, approvedHtml: report.renderedContent, ...signatureResolverContext }),
    })),
    ...canonicalSnapshots.map((report) => {
      const persistedSignature = getPersistedSnapshotSignatureState({
        report,
        signedRequest: signedRequestByCaseId.get(report.caseEntryId) || null,
        schoolSignatureUrl: schoolIdentity.principalSignatureUrl,
        snapshotPayload: report.snapshotPayload,
        snapshotHtml: report.snapshotHtml,
      });
      return {
      id: report.id,
      source: "REPORT_SNAPSHOT" as const,
      title: report.reportTitle,
      serviceKey: report.serviceSlug || report.serviceName || "other",
      serviceTitle: report.serviceName || report.serviceSlug || "خدمة غير محددة",
      status: "APPROVED",
      issuedAt: (report.approvedAt || report.createdAt).toISOString(),
      previewHtml: report.snapshotHtml,
      linkedTargetIds: [],
      principalSignatureSigned: persistedSignature.signed,
      principalSignatureSource: persistedSignature.source,
      principalSignatureDebug: buildPrincipalSignatureDebug({ report, schoolIdentity, signedLink: signedRequestByCaseId.get(report.caseEntryId) || null, sourcePayload: report.snapshotPayload, approvedHtml: report.snapshotHtml, ...signatureResolverContext }),
      };
    }),
    ...activeReports.filter((report) => !snapshotCaseIds.has(report.caseEntryId)).map((report) => ({
      id: report.id,
      source: "REPORT_TWO" as const,
      title: report.reportTitle,
      serviceKey: report.serviceSlug || report.serviceName || "other",
      serviceTitle: report.serviceName || report.serviceSlug || "خدمة غير محددة",
      status: report.status,
      issuedAt: (report.approvedAt || report.updatedAt).toISOString(),
      previewHtml: report.renderedHtml,
      linkedTargetIds: [],
      principalSignatureSigned: isPrincipalStaffReportSigned({ source: "REPORT_TWO", report, signedRequest: report.signatureRequests[0], signatureUrl: schoolIdentity.principalSignatureUrl, structuredPayload: report.sourcePayload, approvedHtml: report.renderedHtml, ...signatureResolverContext }),
      principalSignatureSource: resolvePrincipalSignatureForReport({ schoolIdentity, signLink: report.signatureRequests[0], principalDashboard: report, ...signatureResolverContext }).source,
      principalSignatureDebug: buildPrincipalSignatureDebug({ report, schoolIdentity, signedLink: report.signatureRequests[0], sourcePayload: report.sourcePayload, approvedHtml: report.renderedHtml, ...signatureResolverContext }),
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
