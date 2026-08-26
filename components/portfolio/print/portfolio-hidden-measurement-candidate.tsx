"use client";

import { useEffect } from "react";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import type { PortfolioPhysicalDocument } from "@/lib/portfolio/layout/portfolio-physical-types";
import type { PortfolioThemeId } from "@/lib/portfolio/portfolio-theme-registry";
import { applyPortfolioSmartCandidate, type PortfolioSmartCandidate, type PortfolioSmartMeasurementResult } from "@/lib/portfolio/engine/portfolio-smart-candidates";
import { MinistryElegantPortfolioPrint } from "@/components/portfolio/print/ministry-elegant-portfolio-print";
import { EditorialAtlasPortfolioPrint } from "@/components/portfolio/print/editorial-atlas-portfolio-print";
import { GeometricHorizonPortfolioPrint } from "@/components/portfolio/print/geometric-horizon-portfolio-print";
import { MoeOfficial2024PortfolioPrint } from "@/components/portfolio/print/moe-official-2024-portfolio-print";

type Props = { data: PortfolioPrintData; physicalDocument: PortfolioPhysicalDocument; themeId: PortfolioThemeId; candidate: PortfolioSmartCandidate; onMeasured: (result: PortfolioSmartMeasurementResult) => void };

function renderDesign(data: PortfolioPrintData, document: PortfolioPhysicalDocument, themeId: PortfolioThemeId) {
  if (themeId === "geometric-horizon") return <GeometricHorizonPortfolioPrint data={data} physicalDocument={document} />;
  if (themeId === "editorial-atlas") return <EditorialAtlasPortfolioPrint data={data} physicalDocument={document} />;
  if (themeId === "moe-official-2024") return <MoeOfficial2024PortfolioPrint data={data} physicalDocument={document} />;
  return <MinistryElegantPortfolioPrint data={data} physicalDocument={document} />;
}

function measureCandidate(root: HTMLElement, candidate: PortfolioSmartCandidate): PortfolioSmartMeasurementResult {
  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-portfolio-a4-page], .portfolio-report-page, .portfolio-service-output-page"));
  const page = pages[0];
  const pageRect = page?.getBoundingClientRect();
  const content = page?.querySelector<HTMLElement>("[data-portfolio-smart-content], [data-portfolio-safe-content]");
  const header = page?.querySelector<HTMLElement>("[data-portfolio-page-header], [data-portfolio-header-boundary]");
  const footer = page?.querySelector<HTMLElement>("[data-portfolio-page-footer], [data-portfolio-footer-boundary], .atlas-footer, .hzn-footer, .moe24-page-footer");
  const contentRect = content?.getBoundingClientRect();
  const headerRect = header?.getBoundingClientRect();
  const footerRect = footer?.getBoundingClientRect();
  const contentTop = Math.max(contentRect?.top || 0, headerRect?.bottom || pageRect?.top || 0);
  const contentBottom = Math.min(contentRect?.bottom || 0, footerRect?.top || pageRect?.bottom || 0);
  const blocks = pages.flatMap((item) => Array.from(item.querySelectorAll<HTMLElement>("[data-portfolio-smart-role]")));
  const bottoms = blocks.map((block) => block.getBoundingClientRect().bottom);
  const mainContentBottom = bottoms.length ? Math.max(...bottoms) : contentTop;
  const blockOverflowPx = Math.max(0, mainContentBottom - contentBottom);
  const scrollOverflowPx = content ? Math.max(0, content.scrollHeight - content.clientHeight) : 0;
  const boundingOverflowPx = pages.reduce((max, item) => {
    const itemContent = item.querySelector<HTMLElement>("[data-portfolio-smart-content], [data-portfolio-safe-content]");
    return Math.max(max, itemContent ? Math.max(0, itemContent.getBoundingClientRect().bottom - (item.querySelector<HTMLElement>("[data-portfolio-page-footer], [data-portfolio-footer-boundary], .atlas-footer, .hzn-footer, .moe24-page-footer")?.getBoundingClientRect().top || item.getBoundingClientRect().bottom)) : 0);
  }, 0);
  const overflowPx = Math.max(blockOverflowPx, scrollOverflowPx, boundingOverflowPx);
  const role = blocks.at(-1)?.dataset.portfolioSmartRole || "general";
  return {
    candidateId: candidate.id, fits: overflowPx <= 2, overflowPx, blockOverflowPx, scrollOverflowPx, boundingOverflowPx, mainContentOverflowPx: blockOverflowPx,
    pageHeightPx: pageRect?.height || 0, viewportHeightPx: contentRect?.height || 0,
    headerBoundaryPx: (headerRect?.bottom || 0) - (pageRect?.top || 0), footerBoundaryPx: (footerRect?.top || 0) - (pageRect?.top || 0),
    contentTopPx: contentTop - (pageRect?.top || 0), contentBottomPx: contentBottom - (pageRect?.top || 0), mainContentBottomPx: mainContentBottom - (pageRect?.top || 0),
    fieldHeightPx: blocks.filter((block) => block.dataset.portfolioSmartRole === "fields").reduce((sum, block) => sum + block.getBoundingClientRect().height, 0),
    narrativeHeightPx: blocks.filter((block) => block.dataset.portfolioSmartRole === "narrative").reduce((sum, block) => sum + block.getBoundingClientRect().height, 0),
    evidenceHeightPx: blocks.filter((block) => block.dataset.portfolioSmartRole === "evidence").reduce((sum, block) => sum + block.getBoundingClientRect().height, 0),
    tableHeightPx: blocks.filter((block) => block.dataset.portfolioSmartRole === "table").reduce((sum, block) => sum + block.getBoundingClientRect().height, 0),
    dominantRole: role, severity: overflowPx <= 2 ? "none" : overflowPx <= 12 ? "tiny" : overflowPx <= 48 ? "small" : overflowPx <= 120 ? "medium" : "large", stable: true,
    fieldHeights: Object.fromEntries(Array.from(root.querySelectorAll<HTMLElement>("[data-portfolio-field-key]")).map((field) => [field.dataset.portfolioFieldKey || "", field.getBoundingClientRect().height]).filter(([key]) => Boolean(key))),
  };
}

export function PortfolioHiddenMeasurementCandidate({ data, physicalDocument, themeId, candidate, onMeasured }: Props) {
  const candidateDocument = applyPortfolioSmartCandidate(physicalDocument, candidate);
  useEffect(() => {
    let disposed = false;
    let stablePasses = 0;
    let previous = "";
    const root = document.querySelector<HTMLElement>(`[data-portfolio-measurement-candidate="${candidate.id}"]`);
    if (!root) return;
    const measure = () => {
      if (disposed) return;
      const fingerprint = `${root.textContent?.length || 0}:${root.scrollHeight}:${root.getBoundingClientRect().height}`;
      stablePasses = fingerprint === previous ? stablePasses + 1 : 0;
      previous = fingerprint;
      if (stablePasses >= 2) onMeasured(measureCandidate(root, candidate));
      else requestAnimationFrame(measure);
    };
    const start = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>("img")).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => resolve(), { once: true }); })));
      requestAnimationFrame(() => requestAnimationFrame(measure));
    };
    const resize = new ResizeObserver(() => { stablePasses = 0; requestAnimationFrame(measure); });
    const mutation = new MutationObserver(() => { stablePasses = 0; requestAnimationFrame(measure); });
    resize.observe(root); mutation.observe(root, { subtree: true, childList: true, characterData: true }); void start();
    return () => { disposed = true; resize.disconnect(); mutation.disconnect(); };
  }, [candidate, onMeasured]);
  return <div data-portfolio-measurement-candidate={candidate.id} aria-hidden="true" style={{ position: "fixed", insetInlineStart: "-100000px", top: 0, width: "210mm", visibility: "hidden", pointerEvents: "none" }}>{renderDesign(data, candidateDocument, themeId)}</div>;
}
