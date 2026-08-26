import type { CSSProperties } from "react";
import { MinistryElegantPortfolioPrint } from "@/components/portfolio/print/ministry-elegant-portfolio-print";
import { EditorialAtlasPortfolioPrint } from "@/components/portfolio/print/editorial-atlas-portfolio-print";
import { GeometricHorizonPortfolioPrint } from "@/components/portfolio/print/geometric-horizon-portfolio-print";
import { MoeOfficial2024PortfolioPrint } from "@/components/portfolio/print/moe-official-2024-portfolio-print";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { DEFAULT_PORTFOLIO_THEME_ID, isPortfolioThemeId } from "@/lib/portfolio/portfolio-theme-registry";
import { buildPortfolioLogicalDocument } from "@/lib/portfolio/layout/portfolio-logical-document";
import { planPortfolioPhysicalDocument } from "@/lib/portfolio/layout/portfolio-physical-planner";
import type { PortfolioPhysicalDocument } from "@/lib/portfolio/layout/portfolio-physical-types";
import { PORTFOLIO_A4, PORTFOLIO_FONT_STACK, PORTFOLIO_TYPOGRAPHY } from "@/lib/portfolio/layout/portfolio-typography";
import { PortfolioSmartA4Runtime } from "@/components/portfolio/print/portfolio-smart-a4-runtime";

function buildPhysicalDocument(data: PortfolioPrintData, themeId: import("@/lib/portfolio/portfolio-theme-registry").PortfolioThemeId): PortfolioPhysicalDocument {
  const logical = buildPortfolioLogicalDocument({
    title: data.portfolio.title,
    introText: data.portfolio.introText,
    conclusionText: data.portfolio.conclusionText,
    bioText: data.portfolio.bioText,
    sections: data.sections,
    biography: data.biography,
    educationIdentity: data.educationIdentity,
    qualificationItems: data.qualificationItems,
    customEvidence: data.customEvidence,
    preferences: data.portfolio.preferences,
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
  return planPortfolioPhysicalDocument(logical, themeId);
}

export function PortfolioPrintDocument({ data }: { data: PortfolioPrintData }) {
  const themeId = isPortfolioThemeId(data.portfolio.themeId)
    ? data.portfolio.themeId
    : DEFAULT_PORTFOLIO_THEME_ID;
  const physicalDocument = buildPhysicalDocument(data, themeId);

  // Keep the semantic scale available to every design without duplicating magic values.
  const typographyStyle = {
    "--portfolio-a4-width": `${PORTFOLIO_A4.widthMm}mm`,
    "--portfolio-a4-height": `${PORTFOLIO_A4.heightMm}mm`,
    "--portfolio-font-stack": PORTFOLIO_FONT_STACK,
    "--portfolio-page-title-size": PORTFOLIO_TYPOGRAPHY.pageTitle.size,
    "--portfolio-section-title-size": PORTFOLIO_TYPOGRAPHY.sectionTitle.size,
    "--portfolio-body-size": PORTFOLIO_TYPOGRAPHY.body.size,
    "--portfolio-header-height-mm": `${physicalDocument.frame.headerHeightMm}mm`,
    "--portfolio-footer-height-mm": `${physicalDocument.frame.footerHeightMm}mm`,
    "--portfolio-top-safety-gap-mm": `${physicalDocument.frame.topSafetyGapMm}mm`,
    "--portfolio-bottom-safety-gap-mm": `${physicalDocument.frame.bottomSafetyGapMm}mm`,
    "--portfolio-content-top-mm": `${physicalDocument.frame.contentTopMm}mm`,
    "--portfolio-content-bottom-mm": `${physicalDocument.frame.contentBottomMm}mm`,
  } as CSSProperties;

  const rendered =
    themeId === "geometric-horizon" ? <GeometricHorizonPortfolioPrint data={data} physicalDocument={physicalDocument} /> :
    themeId === "editorial-atlas" ? <EditorialAtlasPortfolioPrint data={data} physicalDocument={physicalDocument} /> :
    themeId === "moe-official-2024" ? <MoeOfficial2024PortfolioPrint data={data} physicalDocument={physicalDocument} /> :
    <MinistryElegantPortfolioPrint data={data} physicalDocument={physicalDocument} />;

  return <div style={typographyStyle}>{rendered}<PortfolioSmartA4Runtime /></div>;
}
