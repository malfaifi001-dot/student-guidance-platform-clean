import { prisma } from "@/lib/prisma";

type HtmlOptions = {
  baseUrl: string;
  cookie?: string | null;
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

function normalizeSurveyHtmlForAttachment(html: string) {
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

async function getLinkedSurveyIdsForReport(caseId: string) {
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
    return [];
  }

  const links = await prisma.dashboardResourceLink.findMany({
    where: {
      schoolAccountId: caseEntry.schoolAccountId,
      sourceType: "CASE_REPORT",
      sourceId: caseId,
      targetType: "SURVEY_ANALYSIS",
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
    return [];
  }

  const surveys = await prisma.survey.findMany({
    where: {
      id: {
        in: targetIds,
      },
      schoolAccountId: caseEntry.schoolAccountId,
    },
    select: {
      id: true,
    },
  });

  const allowed = new Set(surveys.map((survey) => survey.id));

  return targetIds.filter((targetId) => allowed.has(targetId));
}

export async function getLinkedSurveyHtmlItems(
  caseId: string,
  options: HtmlOptions,
) {
  const targetIds = await getLinkedSurveyIdsForReport(caseId);

  if (!targetIds.length || !options.baseUrl) {
    return [];
  }

  const cookie = options.cookie || "";

  const htmlItems = await Promise.all(
    targetIds.map(async (surveyId) => {
      const url = new URL(
        `/api/dashboard/surveys/${encodeURIComponent(surveyId)}/export/pdf`,
        options.baseUrl,
      );

      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: cookie
          ? {
              cookie,
            }
          : undefined,
      });

      if (!response.ok) {
        return "";
      }

      const html = await response.text();

      return normalizeSurveyHtmlForAttachment(html);
    }),
  );

  return htmlItems.filter(Boolean);
}

export async function renderLinkedSurveyAttachmentsHtml(
  caseId: string,
  options: HtmlOptions,
) {
  const htmlItems = await getLinkedSurveyHtmlItems(caseId, options);

  if (!htmlItems.length) {
    return "";
  }

  const pages = htmlItems
    .map((html, index) => {
      return `
        <section class="report-linked-survey-page${index === htmlItems.length - 1 ? " last" : ""}">
          <iframe
            data-report-linked-assessment-frame="1"
            data-report-linked-survey-frame="1"
            class="report-linked-survey-frame"
            srcdoc="${escapeAttribute(html)}"
          ></iframe>
        </section>
      `;
    })
    .join("\n");

  return `
    <style>
      @page reportLinkedSurveyPage {
        size: A4 landscape;
        margin: 0;
      }

      .report-linked-survey-page {
        page: reportLinkedSurveyPage;
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

      .report-linked-survey-page.last {
        break-after: auto;
        page-break-after: auto;
      }

      .report-linked-survey-frame {
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