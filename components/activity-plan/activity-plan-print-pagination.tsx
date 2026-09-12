"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ActivityPlanPhysicalItem = { id: string; node: ReactNode };

/** @deprecated Legacy entry-plan adapter; new physical documents use ActivityPlanPhysicalPaginator. */
export type MeasuredPrintItem<T> = { item: T; heightMm: number };
export function paginateMeasuredPrintItems<T>(items: MeasuredPrintItem<T>[], options: { intermediateCapacityMm: number; finalCapacityMm: number; reserveFinalPage?: boolean }) {
  const pages: T[][] = []; let page: T[] = []; let used = 0;
  for (const entry of items) { if (page.length && used + entry.heightMm > options.intermediateCapacityMm) { pages.push(page); page = []; used = 0; } page.push(entry.item); used += entry.heightMm; }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}

type RenderPage = (args: {
  items: ActivityPlanPhysicalItem[];
  includeSignatures: boolean;
  measuring?: "normal" | "signature";
}) => ReactNode;

type Props = { items: ActivityPlanPhysicalItem[]; renderPage: RenderPage; includeSignatures?: boolean };

const ROUNDING_TOLERANCE_PX = 4;

function pack(items: ActivityPlanPhysicalItem[], heights: number[], capacity: number) {
  const pages: ActivityPlanPhysicalItem[][] = [];
  let page: ActivityPlanPhysicalItem[] = [];
  let used = 0;
  items.forEach((item, index) => {
    const height = heights[index] || 0;
    if (page.length && used + height > capacity + ROUNDING_TOLERANCE_PX) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(item);
    used += height;
  });
  return pages.length || page.length ? [...pages, page] : [[]];
}

/**
 * Activity Plan's intentionally small physical paginator.  It measures the
 * rendered rows and the real remaining content box rather than guessing from
 * row counts.  Signatures are considered only after regular pages are packed.
 */
export function ActivityPlanPhysicalPaginator({ items, renderPage, includeSignatures = true }: Props) {
  const [regularPages, setRegularPages] = useState<ActivityPlanPhysicalItem[][] | null>(null);
  const [signatureFits, setSignatureFits] = useState<boolean | null>(null);
  const normalMeasureRef = useRef<HTMLDivElement>(null);
  const signatureMeasureRef = useRef<HTMLDivElement>(null);
  const fallbackPages = useMemo<ActivityPlanPhysicalItem[][]>(() => items.length ? [items] : [[]], [items]);

  const renderPages = (pages: ActivityPlanPhysicalItem[][], signaturesOnLast: boolean) => <>{pages.map((page, index) => {
    const signatures = signaturesOnLast && index === pages.length - 1;
    const pageId = page.length ? page.map((item) => item.id).join("-") : "signatures";
    return <div key={`${pageId}-${signatures ? "signed" : "content"}`}>{renderPage({ items: page, includeSignatures: signatures })}</div>;
  })}</>;

  useLayoutEffect(() => {
    const candidate = normalMeasureRef.current;
    const content = candidate?.querySelector<HTMLElement>('[data-document-content-zone]');
    const rows = candidate ? Array.from(candidate.querySelectorAll<HTMLElement>('[data-activity-plan-row]')) : [];
    if (!candidate || !content || rows.length !== items.length) {
      setRegularPages(fallbackPages);
      return;
    }

    const rowHeight = rows.reduce((total, row) => total + row.getBoundingClientRect().height, 0);
    const fixedHeight = Math.max(0, content.scrollHeight - rowHeight);
    const capacity = Math.max(0, content.clientHeight - fixedHeight);
    if (!Number.isFinite(capacity) || capacity <= 0 || rows.some((row) => row.getBoundingClientRect().height <= 0)) {
      setRegularPages(fallbackPages);
      return;
    }
    setRegularPages(pack(items, rows.map((row) => row.getBoundingClientRect().height), capacity));
  }, [items, fallbackPages]);

  useLayoutEffect(() => {
    if (!regularPages || !includeSignatures) return;
    const candidate = signatureMeasureRef.current;
    const content = candidate?.querySelector<HTMLElement>('[data-document-content-zone]');
    if (!candidate || !content) {
      setSignatureFits(false);
      return;
    }
    setSignatureFits(content.scrollHeight <= content.clientHeight + ROUNDING_TOLERANCE_PX);
  }, [includeSignatures, regularPages]);

  if (!regularPages) {
    return <>{renderPages(fallbackPages, includeSignatures)}<div ref={normalMeasureRef} className="activity-plan-print-measurement" aria-hidden="true">{renderPage({ items, includeSignatures: false, measuring: "normal" })}</div></>;
  }

  if (!includeSignatures) return renderPages(regularPages, false);

  const last = regularPages[regularPages.length - 1] || [];
  if (signatureFits === null) {
    return <>{renderPages(regularPages, false)}<div ref={signatureMeasureRef} className="activity-plan-print-measurement" aria-hidden="true">{renderPage({ items: last, includeSignatures: true, measuring: "signature" })}</div></>;
  }

  const pages = signatureFits
    ? regularPages.map((page, index) => ({ items: page, signatures: index === regularPages.length - 1 }))
    : [...regularPages.map((page) => ({ items: page, signatures: false })), { items: [], signatures: true }];

  return <>{pages.map((page) => {
    const pageId = page.items.length ? page.items.map((item) => item.id).join("-") : "signatures";
    return <div key={`${pageId}-${page.signatures ? "signed" : "content"}`}>{renderPage({ items: page.items, includeSignatures: page.signatures })}</div>;
  })}</>;
}
