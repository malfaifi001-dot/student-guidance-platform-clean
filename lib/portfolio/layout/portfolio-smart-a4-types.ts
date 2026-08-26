export type PortfolioSmartLayoutCandidate = "comfortable" | "packed" | "compact" | "dense-safe";
export type PortfolioEvidenceLayout = "evidence-2-column" | "evidence-1-column";

export const PORTFOLIO_SMART_LAYOUT_CANDIDATES: readonly PortfolioSmartLayoutCandidate[] = [
  "comfortable",
  "packed",
  "compact",
  "dense-safe",
];

export type PortfolioSmartPageMetadata = {
  layoutCandidate: PortfolioSmartLayoutCandidate;
  evidenceLayout: PortfolioEvidenceLayout;
  primaryEvidenceCount: 0 | 1 | 2;
  overflowEvidenceCount: number;
  fieldLayout?: "balanced-grid" | "dense-grid";
  fieldColumnCount?: 1 | 2 | 3 | 4 | 5 | 6;
  fieldBands?: import("@/lib/portfolio/layout/portfolio-field-layout").PortfolioFieldBand[];
};
