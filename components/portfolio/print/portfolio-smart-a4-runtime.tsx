"use client";

import { useEffect } from "react";

const STABLE_MEASUREMENTS = 2;
const ROUNDING_TOLERANCE_PX = 2;

function mmToPx(value: string) {
  const mm = Number.parseFloat(value);
  return Number.isFinite(mm) ? (mm * 96) / 25.4 : 0;
}

function moveOneEvidenceCard(page: HTMLElement, evidenceGrid: HTMLElement) {
  const card = evidenceGrid.lastElementChild;
  if (!card) return false;
  let continuation = document.querySelector<HTMLElement>(`[data-portfolio-continuation-for="${CSS.escape(page.dataset.portfolioPageId || "")}"]`);
  if (!continuation) {
    continuation = page.cloneNode(true) as HTMLElement;
    continuation.dataset.portfolioContinuationFor = page.dataset.portfolioPageId || "portfolio-report";
    continuation.dataset.portfolioGeneratedContinuation = "true";
    const continuationBody = continuation.querySelector<HTMLElement>(".portfolio-report-body, .atlas-body, .hzn-body, .moe24-page-body");
    if (!continuationBody) return false;
    continuationBody.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = "الشواهد";
    continuationBody.appendChild(heading);
    const continuationGrid = evidenceGrid.cloneNode(false) as HTMLElement;
    continuationBody.appendChild(continuationGrid);
    page.after(continuation);
  }
  const continuationGrid = continuation.querySelector<HTMLElement>(".portfolio-report-evidence-grid, .atlas-evidence-grid, .hzn-evidence-grid, .moe24-evidence-grid");
  if (!continuationGrid) return false;
  continuationGrid.prepend(card);
  return true;
}

export function PortfolioSmartA4Runtime() {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let stableCount = 0;
    let previousSignature = "";
    const root = document.querySelector<HTMLElement>(".portfolio-print-root");
    if (!root) return;

    const measure = () => {
      if (disposed) return;
      const pages = Array.from(root.querySelectorAll<HTMLElement>(".portfolio-report-page"));
      const signature = pages.map((page) => {
        const body = page.querySelector<HTMLElement>("[data-portfolio-safe-content], .portfolio-report-body, .atlas-body, .hzn-body, .moe24-page-body");
        const evidence = page.querySelector<HTMLElement>(".portfolio-report-evidence-grid, .atlas-evidence-grid, .hzn-evidence-grid, .moe24-evidence-grid");
        if (!body) return "";
        return `${Math.round(body.scrollHeight)}:${Math.round(body.clientHeight)}:${Math.round(evidence?.getBoundingClientRect().height || 0)}`;
      }).join("|");
      stableCount = signature === previousSignature ? stableCount + 1 : 0;
      previousSignature = signature;
      pages.forEach((page) => {
        const body = page.querySelector<HTMLElement>("[data-portfolio-safe-content], .portfolio-report-body, .atlas-body, .hzn-body, .moe24-page-body");
        if (!body) return;
        const evidence = page.querySelector<HTMLElement>(".portfolio-report-evidence-grid, .atlas-evidence-grid, .hzn-evidence-grid, .moe24-evidence-grid");
        const footer = page.querySelector<HTMLElement>(".portfolio-report-fixed-footer, .atlas-footer, .hzn-footer, .moe24-page-footer");
        const header = page.querySelector<HTMLElement>("[data-portfolio-header-boundary]");
        const pageRect = page.getBoundingClientRect();
        const rootStyle = getComputedStyle(root);
        const topGap = mmToPx(rootStyle.getPropertyValue("--portfolio-top-safety-gap-mm"));
        const bottomGap = mmToPx(rootStyle.getPropertyValue("--portfolio-bottom-safety-gap-mm"));
        const contentRect = body.getBoundingClientRect();
        const contentTop = Math.max(contentRect.top, (header?.getBoundingClientRect().bottom || pageRect.top) + topGap);
        const contentBottom = Math.min(contentRect.bottom, (footer?.getBoundingClientRect().top || pageRect.bottom) - bottomGap);
        const children = Array.from(body.children).filter((child) => !child.hasAttribute("data-portfolio-decoration"));
        const lastBottom = children.length ? Math.max(...children.map((child) => child.getBoundingClientRect().bottom)) : contentTop;
        const overflow = Math.max(0, lastBottom - contentBottom) > ROUNDING_TOLERANCE_PX;
        const current = page.dataset.portfolioDensity || "comfortable";
        const next = overflow
          ? current === "comfortable" ? "packed" : current === "packed" ? "compact" : "dense-safe"
          : current;
        page.dataset.portfolioDensity = next;
        page.dataset.portfolioPageId ||= `report-${pages.indexOf(page) + 1}`;
        page.dataset.portfolioContentTopPx = String(Math.round(contentTop - pageRect.top));
        page.dataset.portfolioContentBottomPx = String(Math.round(contentBottom - pageRect.top));
        page.dataset.portfolioHeaderBoundaryPx = String(Math.round((header?.getBoundingClientRect().bottom || pageRect.top) - pageRect.top));
        page.dataset.portfolioFooterBoundaryPx = String(Math.round((footer?.getBoundingClientRect().top || pageRect.bottom) - pageRect.top));
        page.dataset.portfolioOverflowPx = String(Math.max(0, Math.round(lastBottom - contentBottom)));
        if (overflow && evidence && evidence.children.length && !page.dataset.portfolioGeneratedContinuation) {
          moveOneEvidenceCard(page, evidence);
          stableCount = 0;
          return;
        }
        page.dataset.portfolioMeasured = stableCount >= STABLE_MEASUREMENTS ? "stable" : "pending";
        page.dataset.portfolioOverflow = overflow && next === "dense-safe" ? "true" : "false";
      });
      if (stableCount < STABLE_MEASUREMENTS) frame = requestAnimationFrame(measure);
    };

    const waitForAssets = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>("img")).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
      frame = requestAnimationFrame(() => requestAnimationFrame(measure));
    };
    const observer = new ResizeObserver(() => { stableCount = 0; requestAnimationFrame(measure); });
    observer.observe(root);
    void waitForAssets();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  return <style>{`
    .portfolio-report-page[data-portfolio-density="packed"] .portfolio-report-sections,
    .portfolio-report-page[data-portfolio-density="packed"] .atlas-report-sections,
    .portfolio-report-page[data-portfolio-density="packed"] .hzn-report-sections,
    .portfolio-report-page[data-portfolio-density="packed"] .moe24-report-sections { gap: 5mm !important; }
    .portfolio-report-page[data-portfolio-density="packed"] .portfolio-report-section,
    .portfolio-report-page[data-portfolio-density="packed"] .atlas-report-section,
    .portfolio-report-page[data-portfolio-density="packed"] .hzn-report-section,
    .portfolio-report-page[data-portfolio-density="packed"] .moe24-report-section { padding: 4mm !important; }
    .portfolio-report-page[data-portfolio-density="packed"] .portfolio-report-evidence-grid,
    .portfolio-report-page[data-portfolio-density="packed"] .atlas-evidence-grid,
    .portfolio-report-page[data-portfolio-density="packed"] .hzn-evidence-grid,
    .portfolio-report-page[data-portfolio-density="packed"] .moe24-evidence-grid { gap: 3mm !important; }
    .portfolio-report-page[data-portfolio-density="packed"] .atlas-detail-card,
    .portfolio-report-page[data-portfolio-density="packed"] .hzn-detail-card,
    .portfolio-report-page[data-portfolio-density="packed"] .portfolio-report-detail-box,
    .portfolio-report-page[data-portfolio-density="packed"] .moe24-report-field { padding: 2.5mm !important; }
    .portfolio-report-page[data-portfolio-density="compact"] .portfolio-report-sections,
    .portfolio-report-page[data-portfolio-density="compact"] .atlas-report-sections,
    .portfolio-report-page[data-portfolio-density="compact"] .hzn-report-sections,
    .portfolio-report-page[data-portfolio-density="compact"] .moe24-report-sections { gap: 3.5mm !important; }
    .portfolio-report-page[data-portfolio-density="compact"] .portfolio-report-section,
    .portfolio-report-page[data-portfolio-density="compact"] .atlas-report-section,
    .portfolio-report-page[data-portfolio-density="compact"] .hzn-report-section,
    .portfolio-report-page[data-portfolio-density="compact"] .moe24-report-section { padding: 3mm !important; }
    .portfolio-report-page[data-portfolio-density="compact"] .portfolio-report-detail-box,
    .portfolio-report-page[data-portfolio-density="compact"] .atlas-detail-grid > *,
    .portfolio-report-page[data-portfolio-density="compact"] .hzn-detail-grid > *,
    .portfolio-report-page[data-portfolio-density="compact"] .moe24-report-detail-grid > * { padding: 2.5mm !important; }
    .portfolio-report-page[data-portfolio-density="compact"] .portfolio-report-evidence-grid,
    .portfolio-report-page[data-portfolio-density="compact"] .atlas-evidence-grid,
    .portfolio-report-page[data-portfolio-density="compact"] .hzn-evidence-grid,
    .portfolio-report-page[data-portfolio-density="compact"] .moe24-evidence-grid { gap: 2mm !important; }
    .portfolio-report-page[data-portfolio-density="compact"] .atlas-detail-card,
    .portfolio-report-page[data-portfolio-density="compact"] .hzn-detail-card,
    .portfolio-report-page[data-portfolio-density="compact"] .moe24-report-field { padding: 2mm !important; min-height: 15mm !important; }
    .portfolio-report-page[data-portfolio-density="dense-safe"] .portfolio-report-sections,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .atlas-report-sections,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .hzn-report-sections,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .moe24-report-sections { gap: 2.5mm !important; }
    .portfolio-report-page[data-portfolio-density="dense-safe"] .portfolio-report-section,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .atlas-report-section,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .hzn-report-section,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .moe24-report-section { padding: 2.5mm !important; }
    .portfolio-report-page[data-portfolio-density="dense-safe"] .portfolio-report-detail-box,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .atlas-detail-grid > *,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .hzn-detail-grid > *,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .moe24-report-detail-grid > * { padding: 2mm !important; }
    .portfolio-report-page[data-portfolio-density="dense-safe"] .portfolio-report-evidence-grid,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .atlas-evidence-grid,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .hzn-evidence-grid,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .moe24-evidence-grid { gap: 1.5mm !important; }
    .portfolio-report-page[data-portfolio-density="dense-safe"] .atlas-detail-card,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .hzn-detail-card,
    .portfolio-report-page[data-portfolio-density="dense-safe"] .moe24-report-field { padding: 1.8mm !important; min-height: 14mm !important; }
  `}</style>;
}
