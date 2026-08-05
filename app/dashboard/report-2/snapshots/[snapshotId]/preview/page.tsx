import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ReportTwoSnapshotPreview } from "@/components/report-2/report-two-snapshot-preview";
import { ReportTwoSnapshotPrintController } from "@/components/report-2/report-two-snapshot-print-controller";
import { ReportTwoLinkedAssessmentAppendix } from "@/components/report-2/report-two-linked-assessment-appendix";
import { ReportTwoLinkedSurveyAppendix } from "@/components/report-2/report-two-linked-survey-appendix";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { buildAssessmentPdfHtml } from "@/lib/assessment-center/assessment-pdf-report";
import { getLinkedSurveyHtmlItems } from "@/lib/report-2/report-linked-survey-attachments";
import { prisma } from "@/lib/prisma";
import { getReportTwoSnapshotById } from "@/lib/report-2/report-snapshot-service";
import { getAuthorizedReportTwoById } from "@/lib/report-2/report-two-access";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";

type PageProps = {
  params: Promise<{
    snapshotId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function getBaseUrlFromHeaders(requestHeaders: Headers) {
  const proto =
    requestHeaders.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "development" ? "http" : "https");

  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";

  return `${proto}://${host}`;
}

function normalizeAssessmentHtmlForPreview(html: string) {
  const forceFrameStyle = `
<style>
  html,
  body{
    width:297mm !important;
    height:210mm !important;
    min-width:297mm !important;
    min-height:210mm !important;
    margin:0 !important;
    padding:0 !important;
    overflow:hidden !important;
    background:#ffffff !important;
    display:block !important;
  }

  .print-frame{
    width:297mm !important;
    height:210mm !important;
    margin:0 !important;
    border:0 !important;
    box-shadow:none !important;
    overflow:hidden !important;
  }

  .sheet{
    margin:0 !important;
    box-shadow:none !important;
  }
</style>`;

  return html.includes("</head>")
    ? html.replace("</head>", `${forceFrameStyle}\n</head>`)
    : `${forceFrameStyle}${html}`;
}

async function getLinkedAssessmentAnalyses({
  context,
  snapshot,
}: {
  context: any;
  snapshot: any;
}) {
  const caseEntryId = safeString(snapshot?.caseEntryId);
  const snapshotSchoolAccountId = safeString(snapshot?.schoolAccountId);
  const schoolAccountId = context?.isAdmin
    ? snapshotSchoolAccountId || safeString(context?.schoolAccountId)
    : safeString(context?.schoolAccountId);

  if (!caseEntryId || !schoolAccountId) {
    return [];
  }

  const links = await prisma.dashboardResourceLink.findMany({
    where: {
      schoolAccountId,
      sourceType: "CASE_REPORT",
      sourceId: caseEntryId,
      targetType: "ASSESSMENT_ANALYSIS",
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      targetId: true,
    },
  });

  const targetIds = links
    .map((link) => link.targetId)
    .filter(Boolean);

  if (!targetIds.length) {
    return [];
  }

  const analyses = await prisma.assessmentAnalysis.findMany({
    where: {
      id: {
        in: targetIds,
      },
      schoolAccountId,
    },
    select: {
      id: true,
      title: true,
      sourceFile: true,
      status: true,
      uploadMode: true,
      totalStudents: true,
      totalRows: true,
      totalSubjects: true,
      averagePercentage: true,
      summaryJson: true,
      rowsJson: true,
      createdAt: true,
      updatedAt: true,
      schoolAccountId: true,
    },
  });

  const byId = new Map(analyses.map((analysis) => [analysis.id, analysis]));

  return targetIds
    .map((targetId) => byId.get(targetId))
    .filter(Boolean);
}

export default async function ReportTwoSnapshotPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const context = await requireDashboardPageContext({ allowPrincipal: true });
  const { snapshotId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const printMode = firstParam(resolvedSearchParams.print) === "1";
  const authorized = await getAuthorizedReportTwoById(
    context,
    snapshotId,
    "REPORT_VIEW",
  );
  if (!authorized) notFound();
  await requireServiceAccessForCurrentUser(
    getActivityProgramsBillingServiceSlug(authorized.caseEntry.service.slug),
  );
  const snapshot = await getReportTwoSnapshotById(context, snapshotId);

  if (!snapshot) {
    notFound();
  }

  const requestHeaders = await headers();
  const baseUrl = getBaseUrlFromHeaders(requestHeaders);
  const cookie = requestHeaders.get("cookie") || "";
  const caseEntryId = safeString((snapshot as any)?.caseEntryId);

  const linkedAssessmentAnalyses = await getLinkedAssessmentAnalyses({
    context,
    snapshot,
  });

  const linkedSurveyHtmlItems = caseEntryId
    ? await getLinkedSurveyHtmlItems(caseEntryId, {
        baseUrl,
        cookie,
      })
    : [];

  const schoolAccountId =
    safeString((snapshot as any)?.schoolAccountId) ||
    safeString((context as any)?.schoolAccountId);

  const schoolProfile = schoolAccountId
    ? await prisma.schoolProfile
        .findFirst({
          where: {
            schoolAccountId,
          },
        })
        .catch(() => null)
    : null;

  const linkedAssessmentHtmlItems = linkedAssessmentAnalyses.map((analysis) => {
    const html = buildAssessmentPdfHtml({
      analysis: analysis as unknown as Record<string, unknown>,
      summary: asRecord((analysis as any).summaryJson),
      rows: asRows((analysis as any).rowsJson),
      schoolProfile: schoolProfile as unknown as Record<string, unknown> | null,
    });

    return normalizeAssessmentHtmlForPreview(html);
  });

  return (
    <>
      {printMode ? <ReportTwoSnapshotPrintController /> : null}

      <ReportTwoSnapshotPreview
        snapshot={snapshot}
        caseTitle={authorized.caseEntry.title}
        printMode={printMode}
      />

      <ReportTwoLinkedAssessmentAppendix htmlItems={linkedAssessmentHtmlItems} />
      <ReportTwoLinkedSurveyAppendix htmlItems={linkedSurveyHtmlItems} />
    </>
  );
}
