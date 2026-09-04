import { composePortfolioSmartPages } from "@/lib/portfolio/engine/portfolio-smart-page-composer";
import { splitPortfolioItems } from "@/lib/portfolio/engine/portfolio-smart-content-utils";
import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";
import type { PortfolioLogicalDocument, PortfolioLogicalSection } from "@/lib/portfolio/layout/portfolio-logical-document";
import type { PortfolioPhysicalDocument, PortfolioPhysicalPage, PortfolioPhysicalPageRole, PortfolioPhysicalPageType } from "@/lib/portfolio/layout/portfolio-physical-types";
import { normalizePortfolioServiceOutput, type PortfolioActivityPlanRow, type PortfolioCurriculumWeek, type PortfolioServiceOutputChunk } from "@/lib/portfolio/service-outputs/service-output-types";
import { formatTenPercentWeeks, type ActivityPlanTenPercentRow } from "@/lib/activity-plan/ten-percent-activity-plan-types";
import { getPortfolioFrame } from "@/lib/portfolio/layout/portfolio-frame-registry";
import type { PortfolioThemeId } from "@/lib/portfolio/portfolio-theme-registry";
import { portfolioPhysicalTrace } from "@/lib/portfolio/debug/portfolio-physical-trace";

const CURRICULUM_FIRST_PAGE_BUDGET = 30;
const CURRICULUM_CONTINUATION_PAGE_BUDGET = 38;

/**
 * Service output pages do not participate in the report candidate measurement
 * pass. Keep their chunks conservative so variable-height table rows cannot
 * reach the fixed footer area. The renderer remains responsible for the
 * visual shell; this function only decides which source rows belong together.
 */
function estimateTextLines(value: unknown, charsPerLine = 24) {
  const text = String(value ?? "").trim();
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function estimateActivityPlanRowHeightMm(row: PortfolioActivityPlanRow) {
  const values = [row.activityArea, row.activity, row.grade, row.supervisor, row.day, row.date, row.period];
  return 5.5 + Math.max(...values.map((value) => estimateTextLines(value)));
}

const TEN_PERCENT_COLUMN_CHARS = {
  domain: 13,
  program: 17,
  periods: 5,
  weeks: 7,
  subject: 7,
  grades: 8,
  teachers: 7,
} as const;

function estimateCellLines(value: unknown, charsPerLine: number) {
  const lines = String(value ?? "").split(/\r?\n/);
  return Math.max(1, lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.trim().length / charsPerLine)), 0));
}

function estimateTenPercentRowHeightMm(row: ActivityPlanTenPercentRow) {
  const lines = Math.max(
    estimateCellLines(row.domains.map((item) => item.title).join("، "), TEN_PERCENT_COLUMN_CHARS.domain),
    estimateCellLines(row.programs.map((item) => item.name).join("، "), TEN_PERCENT_COLUMN_CHARS.program),
    estimateCellLines(row.periodCount || "—", TEN_PERCENT_COLUMN_CHARS.periods),
    estimateCellLines(formatTenPercentWeeks(row.executionWeeks), TEN_PERCENT_COLUMN_CHARS.weeks),
    estimateCellLines(row.subject || "—", TEN_PERCENT_COLUMN_CHARS.subject),
    estimateCellLines(row.grades.join("\n"), TEN_PERCENT_COLUMN_CHARS.grades),
    estimateCellLines(row.teacherNames.join("\n"), TEN_PERCENT_COLUMN_CHARS.teachers),
  );

  // 8.3px font × 1.35 line-height plus 1.8mm vertical padding and borders.
  // The result is calibrated to the observed 6.8/9.8/12.7mm row heights.
  return 3.9 + lines * 3;
}

function splitRowsByEstimatedHeight<T>(rows: T[], estimate: (row: T) => number, budgetMm: number) {
  const pages: T[][] = [];
  let page: T[] = [];
  let height = 0;
  for (const row of rows) {
    const rowHeight = estimate(row);
    if (page.length && height + rowHeight > budgetMm) {
      pages.push(page);
      page = [];
      height = 0;
    }
    page.push(row);
    height += rowHeight;
  }
  if (page.length) pages.push(page);
  return pages;
}

function splitServiceOutputChunkForPhysicalPages(
  chunk: PortfolioServiceOutputChunk,
  contentHeightMm: number,
): PortfolioServiceOutputChunk[] {
  const safeHeightMm = Math.max(120, contentHeightMm - 18);
  if (chunk.kind === "activity-plan") {
    const rowPages = splitRowsByEstimatedHeight(chunk.rows, estimateActivityPlanRowHeightMm, safeHeightMm - 28);
    return rowPages.map((rows, index) => ({
      ...chunk,
      rows,
      summary: index === 0 ? chunk.summary : undefined,
      shareUrl: index === rowPages.length - 1 ? chunk.shareUrl : undefined,
      shareQrDataUrl: index === rowPages.length - 1 ? chunk.shareQrDataUrl : undefined,
    }));
  }
  if (chunk.kind === "ten-percent-activity-plan") {
    const budgetMm = safeHeightMm - 18;
    return splitRowsByEstimatedHeight(chunk.rows, estimateTenPercentRowHeightMm, budgetMm).map((rows) => ({ ...chunk, rows }));
  }
  if (chunk.kind === "activity-team") {
    return splitRowsByEstimatedHeight(chunk.rows, (row) => 9 + estimateTextLines(`${row.label} ${row.supervisor}`, 28), safeHeightMm).map((rows) => ({ ...chunk, rows }));
  }
  if (chunk.kind === "weekly-activity-plan") {
    const weeks = splitPortfolioItems(chunk.weeks, 7);
    return weeks.map((items) => ({ ...chunk, weeks: items }));
  }
  return [chunk];
}

function curriculumWeekWeight(week: PortfolioCurriculumWeek) {
  const textLines = (value: string) => Math.max(1, Math.ceil(value.trim().length / 28));
  const lessonLines = week.units.reduce(
    (total, unit) =>
      total + 1 + textLines(unit.name) + unit.lessons.reduce((sum, lesson) => sum + textLines(lesson), 0),
    0,
  );
  const standaloneLines = week.standalone.reduce((total, lesson) => total + textLines(lesson), 0);
  return 3 + textLines(week.title) + textLines(week.gregorianRange) + lessonLines + standaloneLines;
}

function splitCurriculumWeeksForPhysicalPages(weeks: PortfolioCurriculumWeek[]) {
  const pages: PortfolioCurriculumWeek[][] = [];
  let page: PortfolioCurriculumWeek[] = [];
  let pageWeight = 0;
  let row: PortfolioCurriculumWeek[] = [];
  let rowWeight = 0;

  const flushRow = () => {
    if (!row.length) return;
    const budget = pages.length === 0 ? CURRICULUM_FIRST_PAGE_BUDGET : CURRICULUM_CONTINUATION_PAGE_BUDGET;
    if (page.length && pageWeight + rowWeight > budget) {
      pages.push(page);
      page = [];
      pageWeight = 0;
    }
    page.push(...row);
    pageWeight += rowWeight;
    row = [];
    rowWeight = 0;
  };

  for (const week of weeks) {
    const weight = curriculumWeekWeight(week);
    if (row.length === 3) flushRow();
    row.push(week);
    rowWeight = Math.max(rowWeight, weight);
  }
  flushRow();
  if (page.length) pages.push(page);
  return pages;
}

function roleForPageType(pageType: PortfolioPhysicalPageType): PortfolioPhysicalPageRole {
  if (pageType === "cover") return "cover";
  if (pageType === "performance-divider") return "performance-divider";
  if (pageType === "service-output" || pageType === "service-output-continuation") return "service-output";
  if (pageType === "report" || pageType === "report-evidence") return "report";
  if (pageType === "portfolio-evidence") return "evidence";
  if (pageType === "closing") return "closing";
  return "section";
}

function pageTypeForSection(section: PortfolioLogicalSection, block: PortfolioBlock): PortfolioPhysicalPageType {
  if (block.type === "cover") return "cover";
  if (block.type === "performance-divider") return "performance-divider";
  if (block.type === "service-output") return "service-output";
  if (block.type === "report") return "report";
  if (block.type === "evidence") return "report-evidence";
  if (section.type === "introduction") return "introduction";
  if (section.type === "table-of-contents") return "table-of-contents";
  if (section.type === "educational-identity") return "educational-identity";
  if (section.type === "biography") return "biography";
  if (section.type === "qualification") return "qualification";
  if (section.type === "evidence") return "portfolio-evidence";
  if (section.type === "closing") return "closing";
  return "introduction";
}

function makePage(section: PortfolioLogicalSection, block: PortfolioBlock, pageType: PortfolioPhysicalPageType, id: string, payload: unknown, continuationIndex?: number, continuationCount?: number): PortfolioPhysicalPage {
  return {
    id, role: roleForPageType(pageType), pageType, sectionKey: section.key, sectionTitle: section.title, sourceSectionId: section.id,
    sourceSectionIds: [section.id], blocks: [{ ...block, ...(payload === undefined ? {} : { payload } as never) } as PortfolioBlock],
    continuationIndex, continuationCount, dedicatedPage: section.dedicatedPage,
    startsNewPhysicalPage: section.pagePolicy?.startsNewPhysicalPage,
    canContinue: section.pagePolicy?.canContinue,
    canShareWithNextSection: section.pagePolicy?.canShareWithNextSection,
    density: payload && typeof payload === "object" && "page" in payload ? (payload as { page?: { layoutCandidate?: import("@/lib/portfolio/layout/portfolio-smart-a4-types").PortfolioSmartLayoutCandidate } }).page?.layoutCandidate : undefined,
    evidenceLayout: payload && typeof payload === "object" && "page" in payload ? (payload as { page?: { evidenceLayout?: import("@/lib/portfolio/layout/portfolio-smart-a4-types").PortfolioEvidenceLayout } }).page?.evidenceLayout : undefined,
    primaryEvidenceCount: payload && typeof payload === "object" && "page" in payload ? (payload as { page?: { primaryEvidenceCount?: 0 | 1 | 2 } }).page?.primaryEvidenceCount : undefined,
    overflowEvidenceCount: payload && typeof payload === "object" && "page" in payload ? (payload as { page?: { overflowEvidenceCount?: number } }).page?.overflowEvidenceCount : undefined,
    payload,
  };
}

export function planPortfolioPhysicalDocument(document: PortfolioLogicalDocument, themeId: PortfolioThemeId = "ministry-elegant"): PortfolioPhysicalDocument {
  const pages: PortfolioPhysicalPage[] = [];
  const serviceOutputPages: Record<string, PortfolioPhysicalPage[]> = {};
  const reportPages: Record<string, PortfolioPhysicalPage[]> = {};
  const evidencePages: Record<string, PortfolioPhysicalPage[]> = {};
  const frame = getPortfolioFrame(themeId);

  portfolioPhysicalTrace("PLAN_START", {
    themeId,
    frame,
    logicalSectionCount: document.sections.length,
    logicalBlockCount: document.sections.reduce((total, section) => total + section.blocks.length, 0),
  });

  for (const section of document.sections.filter((item) => item.isEnabled)) {
    for (const block of section.blocks) {
      if (block.type === "service-output") {
        const normalizedChunks = normalizePortfolioServiceOutput(block.payload.output);
        portfolioPhysicalTrace("SERVICE_OUTPUT_START", {
          outputId: block.payload.output.id,
          chunkKind: normalizedChunks.map((chunk) => chunk.kind),
          sourceItemCount: normalizedChunks.reduce((total, chunk) => total + ("rows" in chunk ? chunk.rows.length : "weeks" in chunk ? chunk.weeks.length : 0), 0),
          contentHeightMm: frame.contentHeightMm,
          headerHeightMm: frame.headerHeightMm,
          footerHeightMm: frame.footerHeightMm,
          topSafetyGapMm: frame.topSafetyGapMm,
          bottomSafetyGapMm: frame.bottomSafetyGapMm,
        });
        const chunks: PortfolioServiceOutputChunk[] = normalizedChunks.flatMap<PortfolioServiceOutputChunk>((chunk) =>
          chunk.kind === "curriculum-distribution"
            ? splitCurriculumWeeksForPhysicalPages(chunk.weeks).map((weeks) => ({ ...chunk, weeks }))
            : splitServiceOutputChunkForPhysicalPages(chunk, frame.contentHeightMm),
        );
        chunks.forEach((chunk, chunkIndex) => {
          const estimatedHeightMm = chunk.kind === "ten-percent-activity-plan"
            ? 7 + chunk.rows.reduce((total, row) => total + estimateTenPercentRowHeightMm(row), 0)
            : undefined;
          const budgetMm = chunk.kind === "ten-percent-activity-plan"
            ? Math.max(120, frame.contentHeightMm - 18) - 18
            : undefined;
          portfolioPhysicalTrace("CHUNK_CREATED", {
            outputId: block.payload.output.id,
            chunkKind: chunk.kind,
            chunkIndex,
            rowCount: "rows" in chunk ? chunk.rows.length : undefined,
            weekCount: "weeks" in chunk ? chunk.weeks.length : undefined,
            isContinuation: chunkIndex > 0,
            hasSummary: "summary" in chunk ? Boolean(chunk.summary) : false,
            hasQr: "shareQrDataUrl" in chunk ? Boolean(chunk.shareQrDataUrl) : false,
            estimatedHeightMm,
            budgetMm,
          });
          if (chunk.kind === "ten-percent-activity-plan" && estimatedHeightMm !== undefined && budgetMm !== undefined && estimatedHeightMm > budgetMm + 7) {
            portfolioPhysicalTrace("WARNING", { type: "SERVICE_OUTPUT_CHUNK_TOO_TALL", outputId: block.payload.output.id, chunkIndex, estimatedHeightMm, budgetMm });
          }
        });
        const outputPages = chunks.map((chunk, index) => {
          const pageType = index === 0 ? "service-output" : "service-output-continuation";
          const page = makePage(section, block, pageType, `${block.id}-page-${index + 1}`, { ...block.payload, chunk }, index, chunks.length);
          return { ...page, outputId: block.payload.output.id };
        });
        serviceOutputPages[block.payload.output.id] = outputPages;
        pages.push(...outputPages);
        continue;
      }
      if (block.type === "report" && block.payload.content) {
        const models = composePortfolioSmartPages(block.payload.content);
        portfolioPhysicalTrace("REPORT_START", {
          reportId: block.payload.reportId,
          sourcePageCount: models.length,
          sourceEvidenceIds: block.payload.content.evidenceItems.map((item) => item.id),
          sourceEvidenceCount: block.payload.content.evidenceItems.length,
          hasDetails: block.payload.content.normalizedFields.length > 0,
          hasNarrative: Boolean(block.payload.content.narrative?.body?.trim()),
        });
        const planned = models.map((model, index) => makePage(section, block, "report", `${block.id}-page-${index + 1}`, { ...block.payload, page: model }, index, models.length));
        reportPages[block.payload.reportId] = planned;
        evidencePages[block.payload.reportId] = planned.filter((page) => {
          const payload = page.payload;
          return Boolean(payload && typeof payload === "object" && "page" in payload && Array.isArray((payload as { page?: { sections?: unknown[] } }).page?.sections) && (payload as { page: { sections: Array<{ kind?: string }> } }).page.sections.some((section) => section.kind === "evidence"));
        });
        pages.push(...planned);
        continue;
      }
      if (block.type === "evidence") {
        // Report evidence is negotiated with the report body above; do not add a second copy.
        continue;
      }
      if (block.type === "custom" && section.type === "evidence" && Array.isArray(block.payload.data)) {
        const chunks = splitPortfolioItems(block.payload.data, 2);
        const planned = chunks.map((items, index) => makePage(section, block, "portfolio-evidence", `${block.id}-page-${index + 1}`, { ...block.payload, data: items }, index, chunks.length));
        pages.push(...planned);
        continue;
      }
      pages.push(makePage(section, block, pageTypeForSection(section, block), `${block.id}-page`, block.payload, 0, 1));
    }
  }
  pages.forEach((page) => {
    portfolioPhysicalTrace("FINAL_PAGE", {
      pageId: page.id,
      pageType: page.pageType,
      role: page.role,
      sectionKey: page.sectionKey,
      reportId: page.reportId,
      outputId: page.outputId,
      continuationIndex: page.continuationIndex,
      candidateId: page.candidateId,
      primaryEvidenceCount: page.primaryEvidenceCount,
      overflowEvidenceCount: page.overflowEvidenceCount,
    });
  });
  portfolioPhysicalTrace("PLAN_COMPLETE", {
    physicalPageCount: pages.length,
    reportPageCount: Object.values(reportPages).reduce((total, items) => total + items.length, 0),
    serviceOutputPageCount: Object.values(serviceOutputPages).reduce((total, items) => total + items.length, 0),
    evidencePageCount: Object.values(evidencePages).reduce((total, items) => total + items.length, 0),
  });
  return { pages, frame: getPortfolioFrame(themeId), serviceOutputPages, reportPages, evidencePages };
}

export function getServiceOutputPhysicalWeeks(document: PortfolioPhysicalDocument | undefined, outputId: string): PortfolioCurriculumWeek[][] {
  return (document?.serviceOutputPages[outputId] || []).flatMap((page) => {
    const chunk = page.payload && typeof page.payload === "object" && "chunk" in page.payload ? (page.payload as { chunk?: { kind?: string; weeks?: unknown[] } }).chunk : undefined;
    return chunk?.kind === "curriculum-distribution" ? [chunk.weeks || []] : [];
  }) as PortfolioCurriculumWeek[][];
}

export function getServiceOutputPhysicalChunks(document: PortfolioPhysicalDocument | undefined, outputId: string) {
  return (document?.serviceOutputPages[outputId] || []).flatMap((page) => {
    const chunk = page.payload && typeof page.payload === "object" && "chunk" in page.payload ? (page.payload as { chunk?: unknown }).chunk : undefined;
    return chunk ? [chunk] : [];
  }) as PortfolioServiceOutputChunk[];
}

export function getReportPhysicalPages(document: PortfolioPhysicalDocument, reportId: string) {
  return (document.reportPages[reportId] || []).flatMap((page) => {
    const payload = page.payload;
    return payload && typeof payload === "object" && "page" in payload ? [(payload as { page: unknown }).page] : [];
  }) as import("@/components/portfolio/print/portfolio-print-types").PortfolioReportPageModel[];
}
