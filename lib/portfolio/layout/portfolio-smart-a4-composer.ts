import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import type { PortfolioReportPageModel, PortfolioReportSectionModel } from "@/components/portfolio/print/portfolio-print-types";
import { PORTFOLIO_SMART_LAYOUT_CANDIDATES, type PortfolioEvidenceLayout, type PortfolioSmartLayoutCandidate, type PortfolioSmartPageMetadata } from "@/lib/portfolio/layout/portfolio-smart-a4-types";

const SAFE_SCORES: Record<PortfolioSmartLayoutCandidate, number> = {
  comfortable: 190,
  packed: 222,
  compact: 246,
  "dense-safe": 270,
};

function contentScore(report: PortfolioReportContent) {
  const details = report.normalizedFields.length ? 20 + Math.max(Math.ceil(report.normalizedFields.length / 2), 1) * 18 : 20;
  const narrative = report.narrative?.body?.trim() ? 18 + Math.ceil(report.narrative.body.length / 90) * 6 : 0;
  return details + narrative;
}

function evidenceScore(count: number, layout: PortfolioEvidenceLayout) {
  if (!count) return 0;
  return layout === "evidence-2-column" ? (count === 2 ? 86 : 54) : count === 1 ? 104 : 132;
}

function chooseCandidate(baseScore: number, evidenceCount: 0 | 1 | 2, evidenceLayout: PortfolioEvidenceLayout): PortfolioSmartLayoutCandidate | null {
  return PORTFOLIO_SMART_LAYOUT_CANDIDATES.find((candidate) => baseScore + evidenceScore(evidenceCount, evidenceLayout) <= SAFE_SCORES[candidate]) || null;
}

function metadata(candidate: PortfolioSmartLayoutCandidate, evidenceCount: 0 | 1 | 2, overflowEvidenceCount: number, evidenceLayout: PortfolioEvidenceLayout): PortfolioSmartPageMetadata {
  return { layoutCandidate: candidate, evidenceLayout, primaryEvidenceCount: evidenceCount, overflowEvidenceCount };
}

function page(sections: PortfolioReportSectionModel[], key: string, pageMetadata: PortfolioSmartPageMetadata): PortfolioReportPageModel {
  return { key, sections, ...pageMetadata };
}

/**
 * Portfolio-only report negotiation. It chooses the largest evidence group that
 * can fit under the last readable density before creating continuation pages.
 * The browser runtime may tighten the selected candidate after real DOM measurement.
 */
export function composePortfolioSmartReportPages(report: PortfolioReportContent): PortfolioReportPageModel[] {
  const details: PortfolioReportSectionModel = { kind: "details", fields: report.normalizedFields };
  const narrative: PortfolioReportSectionModel | null = report.narrative?.body?.trim() ? { kind: "narrative", body: report.narrative.body.trim() } : null;
  const baseSections = [details, ...(narrative ? [narrative] : [])];
  const evidence = report.evidenceItems;
  const evidenceLayout: PortfolioEvidenceLayout = "evidence-2-column";
  const baseScore = contentScore(report);

  let selectedCount: 0 | 1 | 2 = 0;
  let selectedCandidate: PortfolioSmartLayoutCandidate = "dense-safe";
  for (const count of [2, 1, 0] as const) {
    const candidate = chooseCandidate(baseScore, count, evidenceLayout);
    if (candidate) {
      selectedCount = count;
      selectedCandidate = candidate;
      break;
    }
  }

  const primaryEvidence = evidence.slice(0, selectedCount);
  const remaining = evidence.slice(selectedCount);
  const primarySections: PortfolioReportSectionModel[] = [...baseSections];
  if (primaryEvidence.length) primarySections.push({ kind: "evidence", items: primaryEvidence });
  const pages: PortfolioReportPageModel[] = [page(primarySections, "report-page-1", metadata(selectedCandidate, selectedCount, remaining.length, evidenceLayout))];

  for (let index = 0; index < remaining.length; index += 2) {
    const items = remaining.slice(index, index + 2);
    pages.push(page([{ kind: "evidence", items }], `report-evidence-page-${pages.length + 1}`, metadata("comfortable", items.length === 1 ? 1 : 2, Math.max(remaining.length - index - items.length, 0), evidenceLayout)));
  }
  return pages;
}
