import "server-only";

import { prisma } from "@/lib/prisma";
import { getPrincipalSchoolContext } from "@/lib/principal/principal-school-service";
import type { UserRole } from "@prisma/client";
import { ReportSignatureRequestStatus } from "@prisma/client";
import { isPrincipalStaffReportSigned } from "@/lib/principal/principal-report-signature-service";
import { resolvePrincipalSignatureForReport } from "@/lib/report-signatures/principal-signature-resolver";
import { tracePrincipalSignature } from "@/lib/report-signatures/principal-signature-trace";
import {
  hasStructuredPrincipalSignature,
  isPrincipalSignaturePresent,
} from "@/lib/report-signatures/principal-signature-state";
import {
  buildReportTwoPreviewCase,
  buildReportTwoRenderContext,
} from "@/lib/report-2/report-two-structured-data";
import { getWorkspaceModulesForRole } from "@/lib/workspace/workspace-modules";
import { isServiceAllowedForUser } from "@/lib/subscription/subscription-service";
import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { getActivityPlanTenPercentRows, isMeaningfulTenPercentRow } from "@/lib/activity-plan/ten-percent-activity-plan-service";
import { countIssuedReportCountsForCaseIds } from "@/lib/statistics/statistics-issued-report-source";

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
          _count: { select: { evidences: true } },
        },
      })
    : [];
  const caseOwnerById = new Map(caseEntries.map((caseEntry) => [caseEntry.id, caseEntry.createdById]));
  const reportCountsByCaseId = await countIssuedReportCountsForCaseIds(
    caseEntries.map((caseEntry) => caseEntry.id),
  );
  const caseEvidenceCountByUserId = new Map<string, number>();

  for (const caseEntry of caseEntries) {
    if (!caseEntry.createdById) continue;
    caseEvidenceCountByUserId.set(
      caseEntry.createdById,
      (caseEvidenceCountByUserId.get(caseEntry.createdById) ?? 0) +
        caseEntry._count.evidences,
    );
  }
  const reportCountByOwner = new Map<string, number>();
  for (const [caseEntryId, count] of reportCountsByCaseId) {
    const ownerId = caseOwnerById.get(caseEntryId);
    if (ownerId) reportCountByOwner.set(ownerId, (reportCountByOwner.get(ownerId) ?? 0) + count);
  }

  return teachers.map((teacher): PrincipalTeacherCardData => ({
    id: teacher.id,
    fullName: teacher.officialName || teacher.name,
    email: teacher.email,
    role: teacher.role as PrincipalTeacherCardData["role"],
    gender: teacher.gender,
    isActive: teacher.isActive,
    // All supported report records inherit ownership from CaseEntry.createdById.
    reportsCount: reportCountByOwner.get(teacher.id) ?? 0,
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
  reportTwoPreview?: {
    template: unknown;
    context: Record<string, string>;
    previewCase: unknown;
    sourcePayload: unknown;
    variantId: string | null;
  };
  linkedTargetIds: string[];
  principalSignatureSigned: boolean;
  principalSignatureSource: "SCHOOL_IDENTITY" | "SIGN_LINK" | "PRINCIPAL_DASHBOARD" | null;
  principalSignatureRequestStatus: "PENDING" | "SIGNED" | "EXPIRED" | "CANCELED" | null;
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
  // An approved snapshot is historical. Its structured signature must be
  // recognized independently of today's SchoolProfile URL or reuse policy.
  // Otherwise replacing/removing the current reusable signature makes an
  // already-issued snapshot look unsigned in the workspace.
  const snapshotHasPrincipalSignature = hasStructuredPrincipalSignature(
    input.snapshotPayload,
  );
  const signed =
    snapshotHasPrincipalSignature ||
    Boolean(
      input.signedRequest?.status === ReportSignatureRequestStatus.SIGNED &&
        input.signedRequest.signedAt &&
        input.signedRequest.signatureUrl,
    ) ||
    Boolean(input.report.principalSignatureUrl && input.report.principalSignatureSignedAt) ||
    // Keep the existing legacy HTML compatibility path for snapshots that
    // predate structured signature persistence.
    isPrincipalSignaturePresent({
      source: "REPORT_SNAPSHOT",
      report: input.report,
      signedRequest: null,
      signatureUrl: input.schoolSignatureUrl,
      structuredPayload: null,
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
  outputFamilies: PrincipalStaffOutputFamily[];
};

export type PrincipalStaffOutputFamilyKey =
  | "REPORTS"
  | "CURRICULUM_DISTRIBUTION"
  | "ACTIVITY_PLAN"
  | "SURVEYS"
  | "CERTIFICATES"
  | "PORTFOLIO"
  | "ASSESSMENTS";

export type PrincipalStaffOutput = {
  id: string;
  sourceType: string;
  sourceId: string;
  ownerUserId: string;
  ownerRole: UserRole;
  serviceSlug: string;
  title: string;
  issuedAt: string;
  status: string;
  canPreview: boolean;
  canPrincipalSign: boolean;
  canLink: boolean;
  previewHref: string | null;
  printHref: string | null;
};

export type PrincipalStaffOutputFamily = {
  key: PrincipalStaffOutputFamilyKey;
  title: string;
  menuAvailable: boolean;
  outputs: PrincipalStaffOutput[];
};

function hasStaffMenuPath(role: UserRole, paths: string[]) {
  if (role !== "TEACHER" && role !== "ACTIVITY_LEADER" && role !== "COUNSELOR") return false;
  const modules = getWorkspaceModulesForRole(role);
  return paths.some((path) => modules.some((module) => module.href === path || module.href.startsWith(`${path}/`)));
}

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
        snapshotTemplateJson: true,
        snapshotPagesJson: true,
        variantId: true,
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
        templateJson: true,
        pagesJson: true,
        renderContext: true,
        previewCase: true,
        variantId: true,
        principalSignatureUrl: true,
        principalSignatureSignedAt: true,
        principalSignatureSignedById: true,
        signatureRequests: { orderBy: { createdAt: "desc" }, select: { status: true, signedAt: true, signatureUrl: true } },
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
      .flatMap((report) => {
        const request = report.signatureRequests.find(
          (item) => item.status === ReportSignatureRequestStatus.SIGNED && item.signedAt && item.signatureUrl,
        );
        return request ? [[report.caseEntryId, request] as const] : [];
      }),
  );
  const latestSignatureRequestByCaseId = new Map(
    activeReports
      .map((report) => [report.caseEntryId, report.signatureRequests[0]] as const)
      .filter((entry) => Boolean(entry[1])),
  );
  for (const report of activeReports) {
    tracePrincipalSignature({
      stage: "REPORT_TWO_ACTIVE_SIGNATURE_STATE",
      location: "getPrincipalStaffReportsWorkspace",
      details: {
        reportId: report.id,
        caseId: report.caseEntryId,
        status: report.status,
        principalSignatureSignedAtExists: Boolean(report.principalSignatureSignedAt),
        signedRequestStatus: report.signatureRequests[0]?.status || null,
        previewSource: snapshotCaseIds.has(report.caseEntryId) ? "REPORT_SNAPSHOT" : "REPORT_TWO_ACTIVE",
      },
      signature: report.principalSignatureUrl,
      payload: report.sourcePayload as any,
    });
  }
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
      principalSignatureRequestStatus: report.signatureRequests[0]?.status || null,
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
      reportTwoPreview:
        report.snapshotTemplateJson && typeof report.snapshotTemplateJson === "object"
          ? {
              template: {
                ...(report.snapshotTemplateJson as Record<string, unknown>),
                pages:
                  report.snapshotPagesJson ||
                  (report.snapshotTemplateJson as Record<string, unknown>).pages,
              },
              context: buildReportTwoRenderContext(report.snapshotPayload as any),
              previewCase: buildReportTwoPreviewCase(report.snapshotPayload as any),
              sourcePayload: report.snapshotPayload,
              variantId: report.variantId,
            }
          : undefined,
      linkedTargetIds: [],
      principalSignatureSigned: persistedSignature.signed,
      principalSignatureSource: persistedSignature.source,
      principalSignatureRequestStatus: latestSignatureRequestByCaseId.get(report.caseEntryId)?.status || null,
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
      reportTwoPreview: report.templateJson && typeof report.templateJson === "object"
        ? {
            template: {
              ...(report.templateJson as Record<string, unknown>),
              pages:
                report.pagesJson ||
                (report.templateJson as Record<string, unknown>).pages,
            },
            context: (report.renderContext || buildReportTwoRenderContext(report.sourcePayload as any)) as Record<string, string>,
            previewCase: report.previewCase || buildReportTwoPreviewCase(report.sourcePayload as any),
            sourcePayload: report.sourcePayload,
            variantId: report.variantId,
          }
        : undefined,
      linkedTargetIds: [],
      principalSignatureSigned: isPrincipalStaffReportSigned({ source: "REPORT_TWO", report, signedRequest: signedRequestByCaseId.get(report.caseEntryId) || null, signatureUrl: schoolIdentity.principalSignatureUrl, structuredPayload: report.sourcePayload, approvedHtml: report.renderedHtml, ...signatureResolverContext }),
      principalSignatureSource: resolvePrincipalSignatureForReport({ schoolIdentity, signLink: signedRequestByCaseId.get(report.caseEntryId) || null, principalDashboard: report, ...signatureResolverContext }).source,
      principalSignatureRequestStatus: report.signatureRequests[0]?.status || null,
      principalSignatureDebug: buildPrincipalSignatureDebug({ report, schoolIdentity, signedLink: signedRequestByCaseId.get(report.caseEntryId) || null, sourcePayload: report.sourcePayload, approvedHtml: report.renderedHtml, ...signatureResolverContext }),
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

  const [certificateRows, activityPlanRows, weeklyPlanRows, tenPercentPlanRows, surveyRows, portfolioRows, savedCurriculumRows] = await Promise.all([
    prisma.issuedCertificate.findMany({
      where: { schoolAccountId: context.schoolAccountId, createdById: staff.id, status: "ISSUED" },
      orderBy: { issueDate: "desc" },
      select: { id: true, certificateType: true, recipientName: true, issueDate: true },
    }),
    prisma.activityPlanEntry.findMany({
      where: { schoolAccountId: context.schoolAccountId, createdById: staff.id },
      orderBy: { updatedAt: "desc" },
      distinct: ["stage"],
      select: { stage: true, updatedAt: true },
    }),
    prisma.weeklyActivityPlanEntry.findMany({
      where: { schoolAccountId: context.schoolAccountId, createdById: staff.id },
      orderBy: { updatedAt: "desc" },
      distinct: ["stage"],
      select: { stage: true, updatedAt: true },
    }),
    getActivityPlanTenPercentRows(context.schoolAccountId, undefined, staff.id),
    prisma.survey.findMany({
      where: {
        schoolAccountId: context.schoolAccountId,
        createdById: staff.id,
        status: { in: ["PUBLISHED", "CLOSED", "ARCHIVED"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, status: true },
    }),
    prisma.portfolioSnapshot.findMany({
      where: { schoolAccountId: context.schoolAccountId, ownerUserId: staff.id, roleAtCreation: staff.role },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.teacherSavedCurriculum.findMany({
      where: { schoolAccountId: context.schoolAccountId, ownerUserId: staff.id, serviceSlug: "curriculum-distribution" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, subjectId: true, semesterId: true, updatedAt: true },
    }),
  ]);

  const outputBase = (input: Omit<PrincipalStaffOutput, "ownerUserId" | "ownerRole">): PrincipalStaffOutput => ({
    ...input,
    ownerUserId: staff.id,
    ownerRole: staff.role,
  });
  const certificateOutputs = certificateRows.map((certificate) => outputBase({
    id: certificate.id,
    sourceType: "ISSUED_CERTIFICATE",
    sourceId: certificate.id,
    serviceSlug: "certificates-honors",
    title: `${certificate.recipientName} — ${certificate.certificateType}`,
    issuedAt: certificate.issueDate.toISOString(),
    status: "ISSUED",
    canPreview: true,
    canPrincipalSign: false,
    canLink: false,
    previewHref: `/certificate-preview/${encodeURIComponent(certificate.id)}`,
    printHref: `/certificate-preview/${encodeURIComponent(certificate.id)}?print=1`,
  }));
  const stageRows = new Map<string, { updatedAt: Date; weekly: boolean; semester: boolean; tenPercent: boolean }>();
  for (const row of activityPlanRows) {
    const stage = row.stage.trim();
    if (!stage || stage === "غير محددة") continue;
    const current = stageRows.get(stage);
    stageRows.set(stage, { updatedAt: current && current.updatedAt > row.updatedAt ? current.updatedAt : row.updatedAt, weekly: true, semester: current?.semester || false, tenPercent: current?.tenPercent || false });
  }
  for (const row of weeklyPlanRows) {
    const stage = row.stage.trim();
    if (!stage || stage === "غير محددة") continue;
    const current = stageRows.get(stage);
    stageRows.set(stage, { updatedAt: current && current.updatedAt > row.updatedAt ? current.updatedAt : row.updatedAt, weekly: current?.weekly || false, semester: true, tenPercent: current?.tenPercent || false });
  }
  for (const row of tenPercentPlanRows.filter(isMeaningfulTenPercentRow)) {
    const stage = row.stage.trim();
    if (!stage || stage === "غير محددة") continue;
    const current = stageRows.get(stage);
    const updatedAt = row.updatedAt ? new Date(row.updatedAt) : new Date();
    stageRows.set(stage, { updatedAt: current && current.updatedAt > updatedAt ? current.updatedAt : updatedAt, weekly: current?.weekly || false, semester: current?.semester || false, tenPercent: true });
  }
  const curriculumOutputs = Array.from(stageRows, ([stage, state]) => [
    ...(state.weekly ? [outputBase({
      id: `curriculum:weekly:${stage}`,
      sourceType: "CURRICULUM_DISTRIBUTION_WEEKLY",
      sourceId: stage,
      serviceSlug: "curriculum-distribution",
      title: `الخطة الأسبوعية — ${stage}`,
      issuedAt: state.updatedAt.toISOString(),
      status: "SAVED",
      canPreview: true,
      canPrincipalSign: false,
      canLink: false,
      previewHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/curriculum/${encodeURIComponent(stage)}?mode=weekly`,
      printHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/curriculum/${encodeURIComponent(stage)}?mode=weekly&print=1`,
    })] : []),
    ...(state.semester ? [outputBase({
      id: `curriculum:semester:${stage}`,
      sourceType: "CURRICULUM_DISTRIBUTION_SEMESTER",
      sourceId: stage,
      serviceSlug: "curriculum-distribution",
      title: `الخطة الفصلية — ${stage}`,
      issuedAt: state.updatedAt.toISOString(),
      status: "SAVED",
      canPreview: true,
      canPrincipalSign: false,
      canLink: false,
      previewHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/curriculum/${encodeURIComponent(stage)}?mode=detailed`,
      printHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/curriculum/${encodeURIComponent(stage)}?mode=detailed&print=1`,
    })] : []),
    ...(state.tenPercent ? [outputBase({
      id: `curriculum:ten-percent:${stage}`,
      sourceType: "CURRICULUM_DISTRIBUTION_TEN_PERCENT",
      sourceId: stage,
      serviceSlug: "student-activity-plan",
      title: `الخطة الفصلية (10%) — ${stage}`,
      issuedAt: state.updatedAt.toISOString(),
      status: "SAVED",
      canPreview: true,
      canPrincipalSign: false,
      canLink: false,
      previewHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/curriculum/${encodeURIComponent(stage)}?mode=ten-percent`,
      printHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/curriculum/${encodeURIComponent(stage)}?mode=ten-percent&print=1`,
    })] : []),
  ]).flat();
  const savedCurriculumWithDistribution = await Promise.all(savedCurriculumRows.map(async (row) => ({ ...row, distribution: await getDistribution(row.subjectId, row.semesterId) })));
  const curriculumDistributionOutputs = savedCurriculumWithDistribution.filter((row) => row.distribution).map((row) => outputBase({
    id: row.id,
    sourceType: "CURRICULUM_DISTRIBUTION",
    sourceId: row.id,
    serviceSlug: "curriculum-distribution",
    title: `توزيع المنهج — ${row.distribution?.subject.name || "مادة دراسية"}`,
    issuedAt: row.updatedAt.toISOString(),
    status: "SAVED",
    canPreview: true,
    canPrincipalSign: false,
    canLink: false,
    previewHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/curriculum-distribution/${encodeURIComponent(row.id)}`,
    printHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/curriculum-distribution/${encodeURIComponent(row.id)}?print=1`,
  }));
  const surveyOutputs = surveyRows.map((survey) => outputBase({
    id: survey.id,
    sourceType: "SURVEY_ANALYSIS",
    sourceId: survey.id,
    serviceSlug: "surveys",
    title: survey.title,
    issuedAt: survey.updatedAt.toISOString(),
    status: survey.status,
    canPreview: true,
    canPrincipalSign: false,
    canLink: false,
    previewHref: `/dashboard/surveys/${encodeURIComponent(survey.id)}/analysis`,
    printHref: `/dashboard/surveys/${encodeURIComponent(survey.id)}/pdf`,
  }));
  const portfolioOutputs = portfolioRows.map((snapshot) => outputBase({
    id: snapshot.id,
    sourceType: "PORTFOLIO_SNAPSHOT",
    sourceId: snapshot.id,
    serviceSlug: "portfolio",
    title: snapshot.name,
    issuedAt: snapshot.createdAt.toISOString(),
    status: "SAVED",
    canPreview: true,
    canPrincipalSign: false,
    canLink: false,
    previewHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/portfolio/${encodeURIComponent(snapshot.id)}`,
    printHref: `/dashboard/principal/teachers/${encodeURIComponent(staff.id)}/portfolio/${encodeURIComponent(snapshot.id)}?print=1`,
  }));

  const [reportsAccess, curriculumAccess, activityPlanAccess, surveysAccess, certificatesAccess, portfolioAccess, assessmentsAccess] = await Promise.all([
    isServiceAllowedForUser({ userId: staff.id, schoolAccountId: context.schoolAccountId, serviceSlug: "reports" }),
    isServiceAllowedForUser({ userId: staff.id, schoolAccountId: context.schoolAccountId, serviceSlug: "curriculum-distribution" }),
    isServiceAllowedForUser({ userId: staff.id, schoolAccountId: context.schoolAccountId, serviceSlug: "student-activity-plan" }),
    isServiceAllowedForUser({ userId: staff.id, schoolAccountId: context.schoolAccountId, serviceSlug: "surveys" }),
    isServiceAllowedForUser({ userId: staff.id, schoolAccountId: context.schoolAccountId, serviceSlug: "certificates-honors" }),
    isServiceAllowedForUser({ userId: staff.id, schoolAccountId: context.schoolAccountId, serviceSlug: "portfolio" }),
    isServiceAllowedForUser({ userId: staff.id, schoolAccountId: context.schoolAccountId, serviceSlug: "assessment-center" }),
  ]);

  const outputFamilies: PrincipalStaffOutputFamily[] = ([
    {
      key: "REPORTS",
      title: "التقارير",
      // Keep approved historical reports visible if current access changes.
      menuAvailable: reports.length > 0 || (hasStaffMenuPath(staff.role, ["/dashboard/report-2", "/dashboard/reports"]) && reportsAccess.ok),
      outputs: [],
    },
    {
      key: "CURRICULUM_DISTRIBUTION",
      title: "توزيع المنهج",
      menuAvailable: (hasStaffMenuPath(staff.role, ["/dashboard/teacher/curriculum-distribution"]) && curriculumAccess.ok) || curriculumDistributionOutputs.length > 0,
      outputs: curriculumDistributionOutputs,
    },
    {
      key: "ACTIVITY_PLAN",
      title: "خطة النشاط الطلابي",
      menuAvailable: (hasStaffMenuPath(staff.role, ["/dashboard/activity-leader/activity-plan"]) && activityPlanAccess.ok) || curriculumOutputs.length > 0,
      outputs: curriculumOutputs,
    },
    {
      key: "SURVEYS",
      title: "الاستبيانات",
      menuAvailable: (hasStaffMenuPath(staff.role, ["/dashboard/surveys", "/dashboard/teacher/surveys", "/dashboard/activity-leader/surveys"]) && surveysAccess.ok) || surveyOutputs.length > 0,
      outputs: surveyOutputs,
    },
    {
      key: "CERTIFICATES",
      title: "الشهادات",
      menuAvailable: (hasStaffMenuPath(staff.role, ["/dashboard/certificates"]) && certificatesAccess.ok) || certificateOutputs.length > 0,
      outputs: certificateOutputs,
    },
    {
      key: "PORTFOLIO",
      title: "ملف الإنجاز",
      menuAvailable: (hasStaffMenuPath(staff.role, ["/dashboard/portfolio", "/dashboard/teacher/portfolio", "/dashboard/activity-leader/portfolio"]) && portfolioAccess.ok) || portfolioOutputs.length > 0,
      outputs: portfolioOutputs,
    },
    {
      key: "ASSESSMENTS",
      title: "تحليل النتائج",
      menuAvailable: hasStaffMenuPath(staff.role, ["/dashboard/assessment-center", "/dashboard/assessments-center"]) && assessmentsAccess.ok,
      // AssessmentAnalysis/ResultsAnalysis are school-scoped and currently
      // have no creator/owner relation, so they cannot be attributed safely
      // to the selected staff member.
      outputs: [],
    },
  ] as PrincipalStaffOutputFamily[]).filter((family) => family.menuAvailable);

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
    outputFamilies,
  } satisfies PrincipalStaffReportsWorkspace;
}
