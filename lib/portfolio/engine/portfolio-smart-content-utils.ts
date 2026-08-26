import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";

export function getPortfolioEvidencePerPage(report: PortfolioReportContent) {
  if (report.evidenceSettings.layout === "ONE_PER_PAGE") return 1;
  return 2;
}

export function getPortfolioEvidenceImageHeightMm(report: PortfolioReportContent) {
  const perPage = getPortfolioEvidencePerPage(report);
  const ratio = report.evidenceSettings.aspectRatio;
  if (perPage <= 1) return ratio === "PORTRAIT_3_4" ? 185 : ratio === "SQUARE_1_1" ? 160 : ratio === "LANDSCAPE_16_9" ? 122 : 138;
  return ratio === "PORTRAIT_3_4" ? 92 : ratio === "SQUARE_1_1" ? 82 : ratio === "LANDSCAPE_16_9" ? 58 : 66;
}

export function splitPortfolioItems<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}
