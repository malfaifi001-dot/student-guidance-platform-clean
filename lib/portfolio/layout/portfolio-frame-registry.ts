import type { PortfolioThemeId } from "@/lib/portfolio/portfolio-theme-registry";
import { PORTFOLIO_A4 } from "@/lib/portfolio/layout/portfolio-typography";

export type PortfolioA4FrameMetrics = {
  pageWidthMm: number; pageHeightMm: number;
  headerHeightMm: number; footerHeightMm: number;
  topSafetyGapMm: number; bottomSafetyGapMm: number;
  contentTopMm: number; contentBottomMm: number; contentHeightMm: number;
};

const frame = (headerHeightMm: number, footerHeightMm: number, topSafetyGapMm = 4, bottomSafetyGapMm = 5): PortfolioA4FrameMetrics => ({
  pageWidthMm: PORTFOLIO_A4.widthMm, pageHeightMm: PORTFOLIO_A4.heightMm,
  headerHeightMm, footerHeightMm, topSafetyGapMm, bottomSafetyGapMm,
  contentTopMm: headerHeightMm + topSafetyGapMm,
  contentBottomMm: PORTFOLIO_A4.heightMm - footerHeightMm - bottomSafetyGapMm,
  contentHeightMm: PORTFOLIO_A4.heightMm - headerHeightMm - footerHeightMm - topSafetyGapMm - bottomSafetyGapMm,
});

export const PORTFOLIO_DESIGN_FRAME_REGISTRY: Record<PortfolioThemeId, PortfolioA4FrameMetrics> = {
  // These values mirror the existing renderer body paddings and footer anchors.
  "editorial-atlas": frame(27, 19),
  "geometric-horizon": frame(30, 20),
  "ministry-elegant": frame(30, 19),
  "moe-official-2024": frame(27, 20),
};

export function getPortfolioFrame(themeId: PortfolioThemeId) {
  return PORTFOLIO_DESIGN_FRAME_REGISTRY[themeId];
}
