/**
 * Compatibility surface for the Portfolio field-layout engine.
 *
 * New placement logic lives in:
 * lib/portfolio/engine/portfolio-field-placement.ts
 *
 * Existing imports are intentionally kept working during the staged rewrite.
 */

export type {
  PortfolioFieldBand,
  PortfolioFieldInternalLayout,
  PortfolioFieldKind,
  PortfolioFieldPlacement,
} from "@/lib/portfolio/engine/portfolio-field-placement";

export {
  classifyPortfolioField,
  getAdaptivePortfolioFieldPlacements,
  getPortfolioFieldBandPlan,
  getPortfolioFieldInternalLayout,
  getPortfolioFieldMetrics,
  getPortfolioFieldSpanForColumns,
} from "@/lib/portfolio/engine/portfolio-field-placement";