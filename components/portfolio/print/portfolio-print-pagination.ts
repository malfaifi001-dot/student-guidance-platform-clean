import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import type { PortfolioReportPageModel, PortfolioReportSectionModel } from "@/components/portfolio/print/portfolio-print-types";

const REPORT_PAGE_SAFE_SCORE = 190;
const REPORT_NARRATIVE_PAGE_CHAR_LIMIT = 1400;

export function chunkPortfolioItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export function paginatePortfolioText(body: string, limit = 1800): string[] {
  const text = body.trim();
  if (!text) return [""];
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const pages: string[] = [];
  let current = "";
  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    const parts = paragraph.length > limit ? paragraph.match(new RegExp(`.{1,${limit}}(?:\\s|$)`, "gs"))?.map((item) => item.trim()).filter(Boolean) || [paragraph] : [paragraph];
    for (const part of parts) {
      const next = current ? `${current}\n\n${part}` : part;
      if (current && next.length > limit) { pages.push(current); current = part; } else current = next;
    }
  }
  if (current) pages.push(current);
  return pages;
}

function splitNarrativeIntoPages(body: string): string[] {
  const cleanBody = body.trim();
  if (!cleanBody) return [];
  const source = cleanBody.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const pages: string[] = [];
  let current = "";
  for (const paragraph of source.length ? source : [cleanBody]) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (current && next.length > REPORT_NARRATIVE_PAGE_CHAR_LIMIT) {
      pages.push(current);
      current = paragraph;
    } else current = next;
  }
  if (current) pages.push(current);
  return pages;
}

export function getPortfolioEvidencePerPage(report: PortfolioReportContent) {
  const { layout, aspectRatio, fit } = report.evidenceSettings;
  if (layout === "ATTACHMENT_LIST") return 10;
  if (layout === "ONE_PER_PAGE") return 1;
  if (layout === "TWO_PER_PAGE") return 2;
  if (layout === "GRID_2X2") {
    if (aspectRatio === "PORTRAIT_3_4") return 2;
    if (aspectRatio === "SQUARE_1_1" && fit === "cover") return 4;
    return 4;
  }
  return 2;
}

export function getPortfolioEvidenceImageHeightMm(report: PortfolioReportContent) {
  const perPage = getPortfolioEvidencePerPage(report);
  const ratio = report.evidenceSettings.aspectRatio;
  if (perPage <= 1) return ratio === "PORTRAIT_3_4" ? 185 : ratio === "SQUARE_1_1" ? 160 : ratio === "LANDSCAPE_16_9" ? 122 : 138;
  if (perPage === 2) return ratio === "PORTRAIT_3_4" ? 92 : ratio === "SQUARE_1_1" ? 82 : ratio === "LANDSCAPE_16_9" ? 58 : 66;
  return ratio === "SQUARE_1_1" ? 56 : ratio === "LANDSCAPE_16_9" ? 42 : ratio === "PORTRAIT_3_4" ? 82 : 48;
}

function sectionScore(section: PortfolioReportSectionModel, report: PortfolioReportContent) {
  if (section.kind === "details") return 20 + Math.max(Math.ceil(section.fields.length / 2), 1) * 18;
  if (section.kind === "narrative") return 18 + Math.ceil(section.body.length / 90) * 6;
  const perPage = getPortfolioEvidencePerPage(report);
  const shown = Math.min(section.items.length || 1, perPage);
  if (perPage <= 1) return 105;
  if (perPage === 2) return shown <= 1 ? 92 : 104;
  return shown <= 2 ? 66 : 104;
}

export function buildPortfolioReportPages(report: PortfolioReportContent): PortfolioReportPageModel[] {
  const pending: PortfolioReportSectionModel[] = [
    { kind: "details", fields: report.normalizedFields },
    ...splitNarrativeIntoPages(report.narrative?.body || "").map((body) => ({ kind: "narrative" as const, body })),
    ...chunkPortfolioItems(report.evidenceItems, getPortfolioEvidencePerPage(report)).map((items) => ({ kind: "evidence" as const, items })),
  ];
  const pages: PortfolioReportPageModel[] = [];
  let sections: PortfolioReportSectionModel[] = [];
  let score = 0;
  const push = () => {
    if (!sections.length) return;
    pages.push({ key: `report-page-${pages.length + 1}`, sections });
    sections = [];
    score = 0;
  };
  for (const section of pending) {
    const nextScore = sectionScore(section, report);
    if (sections.length && score + nextScore > REPORT_PAGE_SAFE_SCORE) push();
    sections.push(section);
    score += Math.min(nextScore, REPORT_PAGE_SAFE_SCORE);
  }
  push();
  if (!pages.length) pages.push({ key: "report-page-1", sections: [{ kind: "details", fields: [] }] });
  return pages;
}
