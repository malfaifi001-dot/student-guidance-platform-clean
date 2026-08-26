import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import { composePortfolioSmartReportPages } from "@/lib/portfolio/layout/portfolio-smart-a4-composer";

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

export function getPortfolioEvidencePerPage(report: PortfolioReportContent) {
  const { layout, aspectRatio, fit } = report.evidenceSettings;
  // Portfolio physical pages reserve a predictable evidence stage: never more than two.
  if (layout === "ATTACHMENT_LIST") return 2;
  if (layout === "ONE_PER_PAGE") return 1;
  if (layout === "TWO_PER_PAGE") return 2;
  if (layout === "GRID_2X2") {
    if (aspectRatio === "PORTRAIT_3_4") return 2;
    return 2;
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

export function buildPortfolioReportPages(report: PortfolioReportContent) {
  return composePortfolioSmartReportPages(report);
}
