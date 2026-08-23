import { MinistryElegantPortfolioPrint } from "@/components/portfolio/print/ministry-elegant-portfolio-print";
import { EditorialAtlasPortfolioPrint } from "@/components/portfolio/print/editorial-atlas-portfolio-print";
import { GeometricHorizonPortfolioPrint } from "@/components/portfolio/print/geometric-horizon-portfolio-print";
import { MoeOfficial2024PortfolioPrint } from "@/components/portfolio/print/moe-official-2024-portfolio-print";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { DEFAULT_PORTFOLIO_THEME_ID, isPortfolioThemeId } from "@/lib/portfolio/portfolio-theme-registry";
import { buildPortfolioLogicalDocument } from "@/lib/portfolio/layout/portfolio-logical-document";
import { planPortfolioPhysicalDocument } from "@/lib/portfolio/layout/portfolio-physical-planner";
import type { PortfolioPhysicalDocument } from "@/lib/portfolio/layout/portfolio-physical-types";

function buildPhysicalDocument(data: PortfolioPrintData): PortfolioPhysicalDocument {
  const logical = buildPortfolioLogicalDocument({
    title: data.portfolio.title,
    sections: data.sections,
    performanceSections: data.performanceSections.map((section) => ({
      id: section.id,
      key: section.key,
      title: section.title,
      sortOrder: section.sortOrder,
      isEnabled: section.isEnabled,
      intro: section.intro,
      linkedOutputs: section.linkedOutputs,
      reports: section.reports.map((report) => ({ id: report.id, title: report.title, content: report.content })),
    })),
  });
  return planPortfolioPhysicalDocument(logical);
}

export function PortfolioPrintDocument({ data }: { data: PortfolioPrintData }) {
  const physicalDocument = buildPhysicalDocument(data);
  const themeId = isPortfolioThemeId(data.portfolio.themeId)
    ? data.portfolio.themeId
    : DEFAULT_PORTFOLIO_THEME_ID;

  if (themeId === "geometric-horizon") {
    return <GeometricHorizonPortfolioPrint data={data} physicalDocument={physicalDocument} />;
  }

  if (themeId === "editorial-atlas") {
    return <EditorialAtlasPortfolioPrint data={data} physicalDocument={physicalDocument} />;
  }

  if (themeId === "moe-official-2024") {
    return <MoeOfficial2024PortfolioPrint data={data} physicalDocument={physicalDocument} />;
  }

  return <MinistryElegantPortfolioPrint data={data} physicalDocument={physicalDocument} />;
}
