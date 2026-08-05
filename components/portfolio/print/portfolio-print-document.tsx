import { MinistryElegantPortfolioPrint } from "@/components/portfolio/print/ministry-elegant-portfolio-print";
import { MoeOfficial2024PortfolioPrint } from "@/components/portfolio/print/moe-official-2024-portfolio-print";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { DEFAULT_PORTFOLIO_THEME_ID, isPortfolioThemeId } from "@/lib/portfolio/portfolio-theme-registry";

export function PortfolioPrintDocument({ data }: { data: PortfolioPrintData }) {
  const themeId = isPortfolioThemeId(data.portfolio.themeId)
    ? data.portfolio.themeId
    : DEFAULT_PORTFOLIO_THEME_ID;

  if (themeId === "moe-official-2024") {
    return <MoeOfficial2024PortfolioPrint data={data} />;
  }

  return <MinistryElegantPortfolioPrint data={data} />;
}
