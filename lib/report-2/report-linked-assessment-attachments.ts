import { prisma } from "@/lib/prisma";
import { buildAssessmentPdfHtml } from "@/lib/assessment-center/assessment-pdf-report";

type RenderOptions = {
  baseUrl?: string;
};

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeAssessmentHtmlForAttachment(html: string) {
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

async function getLinkedAssessmentsForReport(caseId: string) {
  const caseEntry = await prisma.caseEntry.findFirst({
    where: {
      id: caseId,
    },
    select: {
      id: true,
      schoolAccountId: true,
    },
  });

  if (!caseEntry?.schoolAccountId) {
    return {
      schoolAccountId: "",
      analyses: [],
      schoolProfile: null,
    };
  }

  const links = await prisma.dashboardResourceLink.findMany({
    where: {
      schoolAccountId: caseEntry.schoolAccountId,
      sourceType: "CASE_REPORT",
      sourceId: caseId,
      targetType: "ASSESSMENT_ANALYSIS",
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      targetId: true,
    },
  });

  const targetIds = links
    .map((link) => safeString(link.targetId))
    .filter(Boolean);

  if (!targetIds.length) {
    return {
      schoolAccountId: caseEntry.schoolAccountId,
      analyses: [],
      schoolProfile: null,
    };
  }

  const [analyses, schoolProfile] = await Promise.all([
    prisma.assessmentAnalysis.findMany({
      where: {
        id: {
          in: targetIds,
        },
        schoolAccountId: caseEntry.schoolAccountId,
      },
      select: {
        id: true,
        schoolAccountId: true,
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
      },
    }),
    prisma.schoolProfile
      .findFirst({
        where: {
          schoolAccountId: caseEntry.schoolAccountId,
        },
      })
      .catch(() => null),
  ]);

  const byId = new Map(analyses.map((analysis) => [analysis.id, analysis]));

  const orderedAnalyses = targetIds.flatMap((targetId) => {
    const analysis = byId.get(targetId);

    return analysis ? [analysis] : [];
  });

  return {
    schoolAccountId: caseEntry.schoolAccountId,
    analyses: orderedAnalyses,
    schoolProfile,
  };
}

export async function renderLinkedAssessmentAttachmentsHtml(
  caseId: string,
  _options: RenderOptions = {},
) {
  const { analyses, schoolProfile } = await getLinkedAssessmentsForReport(caseId);

  if (!analyses.length) {
    return "";
  }

  const pages = analyses
    .map((analysis, index) => {
      const html = normalizeAssessmentHtmlForAttachment(
        buildAssessmentPdfHtml({
          analysis,
          summary:
            analysis.summaryJson && typeof analysis.summaryJson === "object"
              ? (analysis.summaryJson as Record<string, unknown>)
              : null,
          rows: Array.isArray(analysis.rowsJson)
            ? (analysis.rowsJson as Record<string, unknown>[])
            : [],
          schoolProfile: schoolProfile as Record<string, unknown> | null,
        }),
      );

      return `
        <section class="report-linked-assessment-page${index === analyses.length - 1 ? " last" : ""}">
          <iframe
            data-report-linked-assessment-frame="1"
            class="report-linked-assessment-frame"
            srcdoc="${escapeAttribute(html)}"
          ></iframe>
        </section>
      `;
    })
    .join("\n");

  return `
    <style>
      @page reportLinkedAssessmentPage {
        size: A4 landscape;
        margin: 0;
      }

      .report-linked-assessment-page {
        page: reportLinkedAssessmentPage;
        width: 297mm;
        height: 210mm;
        min-width: 297mm;
        min-height: 210mm;
        max-width: 297mm;
        max-height: 210mm;
        margin: 0 auto;
        padding: 0;
        background: #ffffff;
        overflow: hidden;
        break-before: page;
        page-break-before: always;
        break-after: page;
        page-break-after: always;
        page-break-inside: avoid;
        break-inside: avoid-page;
      }

      .report-linked-assessment-page.last {
        break-after: auto;
        page-break-after: auto;
      }

      .report-linked-assessment-frame {
        display: block;
        width: 297mm;
        height: 210mm;
        border: 0;
        margin: 0;
        padding: 0;
        background: #ffffff;
        overflow: hidden;
      }
    </style>

    ${pages}
  `;
}