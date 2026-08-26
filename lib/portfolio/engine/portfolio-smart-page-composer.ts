import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import { composePortfolioReportPages } from "@/lib/portfolio/engine/portfolio-smart-physical-composer";
import type { PortfolioReportPageModel } from "@/components/portfolio/print/portfolio-print-types";

/**
 * Portfolio's special-content composer boundary.
 *
 * All variable report content enters the physical engine through this module.
 * Evidence is negotiated after the regular blocks (details and narrative), and
 * continuation pages are returned as finalized page models for the renderer.
 * This intentionally has no dependency on the Report2 engine.
 */
export function composePortfolioSmartPages(content: PortfolioReportContent): PortfolioReportPageModel[] {
  return composePortfolioReportPages(content);
}
