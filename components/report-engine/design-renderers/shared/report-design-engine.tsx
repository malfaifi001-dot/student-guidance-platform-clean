"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  isReportDesignId,
  reportDesignTemplates,
} from "../report-design-registry";
import { getReportDesignImplementation } from "../report-design-implementations";
import type { ReportDesignId } from "../report-design-types";

export {
  reportDesignTemplates,
  selectableReportDesignTemplates,
  SELECTABLE_REPORT_DESIGN_IDS,
  isSelectableReportDesignId,
} from "../report-design-registry";
export type { ReportDesignId } from "../report-design-types";

import { getReportHeaderSettingsStyle } from "./report-header";
import type { PreviewCaseData, ReportDesignRendererProps } from "./report-types";

import { getReportDesignSignatureStyleText } from "./report-signatures";
import { SmartPhysicalReportComposer } from "../smart-layout/report-smart-physical-pages";
import type { ReportTwoPhysicalNavigationItem } from "../smart-layout/report-smart-physical-types";


export function ReportDesignRenderer({
  designId,
  template,
  activePage,
  activePageId,
  context,
  previewCase,
  onActivePageChange,
  onAddPage,
  onMovePage,
  onDeletePage,
  canMovePage,
  canDeletePage,
  renderMode = "single",
  chromeLayout = "joined",
  suppressAutoEvidencePages = false,
}: ReportDesignRendererProps) {
  const selectedDesign = normalizeDesignId(
    designId || template?.designTemplateId || "ministry-form",
  );
  const implementation = getReportDesignImplementation(selectedDesign);

  const logoStyleText = getReportDesignLogoStyleText(
    context,
    implementation.defaultLogoWidthPx || 96,
    implementation.defaultLogoHeightPx || 56,
  );
  const headerStyleText = getReportHeaderSettingsStyle(
    template?.designConfig?.header,
  );
  const signatureStyleText = getReportDesignSignatureStyleText();
  const pages = useMemo<any[]>(
    () => template?.pages || [],
    [template?.pages],
  );
  const [physicalNavigationItems, setPhysicalNavigationItems] = useState<
    ReportTwoPhysicalNavigationItem[]
  >([]);
  const [activePhysicalPageId, setActivePhysicalPageId] = useState("");
  const previousPhysicalNavigationItemsRef = useRef<
    ReportTwoPhysicalNavigationItem[]
  >([]);
  const autoSurfacedPhysicalPageIdsRef = useRef(new Set<string>());

  useEffect(() => {
    previousPhysicalNavigationItemsRef.current = [];
    autoSurfacedPhysicalPageIdsRef.current.clear();
    setPhysicalNavigationItems([]);
    setActivePhysicalPageId("");
  }, [pages, selectedDesign]);

  const handlePhysicalPagesChange = useCallback(
    (items: ReportTwoPhysicalNavigationItem[]) => {
      const previousItems = previousPhysicalNavigationItemsRef.current;
      previousPhysicalNavigationItemsRef.current = items;
      const previousActiveItems = previousItems.filter((item) =>
        item.sourcePageIds.includes(activePageId),
      );
      const nextActiveItems = items.filter((item) =>
        item.sourcePageIds.includes(activePageId),
      );
      const previousIds = new Set(
        previousActiveItems.map((item) => item.physicalPageId),
      );
      const currentItem = items.find(
        (item) => item.physicalPageId === activePhysicalPageId,
      );
      const currentPhysicalIndex =
        currentItem?.sourcePageIds.includes(activePageId)
          ? currentItem.physicalIndexWithinLogicalPage
          : 0;
      const nextAutomaticPage = nextActiveItems
        .filter(
          (item) =>
            !previousIds.has(item.physicalPageId) &&
            !autoSurfacedPhysicalPageIdsRef.current.has(
              item.physicalPageId,
            ) &&
            item.physicalIndexWithinLogicalPage > currentPhysicalIndex &&
            (item.role !== "primary" ||
              item.physicalIndexWithinLogicalPage > 1),
        )
        .sort((left, right) => {
          const rolePriority = {
            primary: 0,
            evidence: 1,
            signature: 2,
          } as const;

          return (
            rolePriority[right.role] - rolePriority[left.role] ||
            right.physicalIndexWithinLogicalPage -
              left.physicalIndexWithinLogicalPage
          );
        })[0];

      setPhysicalNavigationItems((current) => {
        const currentKey = current
          .map((item) => `${item.physicalPageId}:${item.label}`)
          .join("|");
        const nextKey = items
          .map((item) => `${item.physicalPageId}:${item.label}`)
          .join("|");

        return currentKey === nextKey ? current : items;
      });

      if (
        nextActiveItems.length > previousActiveItems.length &&
        nextAutomaticPage
      ) {
        autoSurfacedPhysicalPageIdsRef.current.add(
          nextAutomaticPage.physicalPageId,
        );
        setActivePhysicalPageId(nextAutomaticPage.physicalPageId);
        return;
      }

      setActivePhysicalPageId((current) => {
        const currentItem = items.find(
          (item) => item.physicalPageId === current,
        );

        if (currentItem?.sourcePageIds.includes(activePageId)) {
          return current;
        }

        return (
          items.find((item) =>
            item.sourcePageIds.includes(activePageId),
          )?.physicalPageId || items[0]?.physicalPageId || ""
        );
      });
    },
    [activePageId, activePhysicalPageId],
  );

  useEffect(() => {
    if (!physicalNavigationItems.length) {
      return;
    }

    setActivePhysicalPageId((current) => {
      const currentItem = physicalNavigationItems.find(
        (item) => item.physicalPageId === current,
      );

      if (currentItem?.sourcePageIds.includes(activePageId)) {
        return current;
      }

      return (
        physicalNavigationItems.find((item) =>
          item.sourcePageIds.includes(activePageId),
        )?.physicalPageId || current
      );
    });
  }, [activePageId, physicalNavigationItems]);

  const pageNavigationItems = useMemo<ReportTwoPhysicalNavigationItem[]>(
    () =>
      physicalNavigationItems.length > 0
        ? physicalNavigationItems
        : pages.map((page: any, index: number) => ({
            physicalPageId: "",
            corePhysicalPageId: "",
            sourceLogicalPageId: page.id,
            sourcePageIds: [page.id],
            label: page.title,
            physicalPageIndex: index,
            physicalIndexWithinLogicalPage: 1,
            role: "primary" as const,
          })),
    [pages, physicalNavigationItems],
  );

  const logoStyle = <style>{logoStyleText}</style>;
  const headerStyle = headerStyleText ? <style>{headerStyleText}</style> : null;
  const signatureStyle = <style>{signatureStyleText}</style>;

  const controls = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            المعاينة الرسمية A4
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            التصميم الحالي: {getDesignName(selectedDesign)}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {previewCase ? "Case ID فعلي" : "بيانات تجريبية"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pageNavigationItems.map((navigationItem, index) => {
          const page = pages.find(
            (candidate: any) =>
              candidate.id === navigationItem.sourceLogicalPageId,
          );
          const active = navigationItem.physicalPageId
            ? navigationItem.physicalPageId === activePhysicalPageId
            : navigationItem.sourceLogicalPageId === activePageId;
          const isLogicalPageControl =
            navigationItem.physicalIndexWithinLogicalPage === 1;
          const canMovePrevious =
            page && isLogicalPageControl
              ? canMovePage?.(page.id, "previous") ??
                pages.findIndex((candidate: any) => candidate.id === page.id) > 0
              : false;
          const canMoveNext =
            page && isLogicalPageControl
              ? canMovePage?.(page.id, "next") ??
                pages.findIndex((candidate: any) => candidate.id === page.id) < pages.length - 1
              : false;
          const canDelete =
            page && isLogicalPageControl
              ? canDeletePage?.(page.id) ?? false
              : false;

          return (
            <div
              key={`${navigationItem.physicalPageId || navigationItem.sourceLogicalPageId}-${index}`}
              className={[
                "inline-flex items-center gap-1 rounded-2xl border px-2 py-1 text-xs font-black transition",
                active
                  ? "border-emerald-600 bg-emerald-700 text-white shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => {
                  if (navigationItem.physicalPageId) {
                    setActivePhysicalPageId(navigationItem.physicalPageId);
                  }

                  if (navigationItem.sourceLogicalPageId !== activePageId) {
                    onActivePageChange(navigationItem.sourceLogicalPageId);
                  }
                }}
                className="max-w-[220px] truncate px-2 py-1"
                title={navigationItem.label}
              >
                {navigationItem.label}
              </button>

              {active && page && isLogicalPageControl ? (
                <>
                  <button
                    type="button"
                    disabled={!canMovePrevious}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMovePage?.(page.id, "previous");
                    }}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/15 px-1 text-[11px] font-black hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-30"
                    title="تحريك الصفحة للخلف"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    disabled={!canMoveNext}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMovePage?.(page.id, "next");
                    }}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/15 px-1 text-[11px] font-black hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-30"
                    title="تحريك الصفحة للأمام"
                  >
                    ↓
                  </button>

                  {canDelete ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeletePage?.(page.id);
                      }}
                      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500/90 px-1 text-[11px] font-black text-white hover:bg-red-600"
                      title="حذف الصفحة"
                    >
                      ×
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onAddPage}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
        >
          + صفحة محتوى
        </button>
      </div>
    </>
  );

  const preview = (
    <div className="report-design-logo-control-style">
      <SmartPhysicalReportComposer
        designId={selectedDesign}
        pages={pages}
        activePageId={activePageId}
        activePhysicalPageId={activePhysicalPageId}
        context={context}
        previewCase={previewCase}
        fallbackPageLabel={activePage?.title || "التقرير"}
        renderMode={renderMode}
        suppressAutoEvidencePages={suppressAutoEvidencePages}
        onPhysicalPagesChange={handlePhysicalPagesChange}
      />
    </div>
  );

  if (chromeLayout === "none") {
    return (
      <>
        {logoStyle}
        {headerStyle}
        {signatureStyle}
        {preview}
      </>
    );
  }

  if (chromeLayout === "split") {
    return (
      <div className="space-y-4">
        {logoStyle}
        {headerStyle}
        {signatureStyle}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {controls}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {preview}
        </section>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {logoStyle}
      {headerStyle}
      {signatureStyle}

      <div className="report-design-logo-control-style">
        <div className="mb-5">{controls}</div>
        {preview}
      </div>
    </section>
  );
}
export function FinalReportDesignRenderer({
  template,
  previewCaseData,
  editorialBlocks = {},
  identity = {},
}: {
  template: any;
  previewCaseData: PreviewCaseData | null;
  editorialBlocks?: Record<string, string>;
  identity?: Record<string, any>;
}) {
  const selectedDesign = normalizeDesignId(
    template?.designTemplateId || template?.designTheme || "ministry-form",
  );

  const normalizedTemplate = normalizeFinalReportTemplate(
    template,
    editorialBlocks,
    previewCaseData,
  );

  const context = buildFinalReportContext(previewCaseData, identity);
  const headerStyleText = getReportHeaderSettingsStyle(
    template?.designConfig?.header,
  );
  const signatureStyleText = getReportDesignSignatureStyleText();

  const pages = normalizedTemplate.pages?.length
    ? normalizedTemplate.pages
    : [
        {
          id: "final-preview-fallback",
          title: normalizedTemplate.name || "التقارير",
          kind: "content",
          blocks: [
            {
              id: "fallback-title",
              kind: "hero-title",
              title: "عنوان التقارير",
              content: "{{case.title}}",
              variant: "hero",
              align: "center",
              showTitle: false,
              placement: "flow",
            },
            {
              id: "fallback-fields",
              kind: "dynamic-fields",
              title: "بيانات الحالة",
              content: "",
              variant: "card",
              align: "right",
              showTitle: true,
              placement: "flow",
            },
          ],
        },
      ];

  return (
    <section className="space-y-4 bg-transparent print:space-y-0" dir="rtl">
      {headerStyleText ? <style>{headerStyleText}</style> : null}
      <style>{signatureStyleText}</style>
      <SmartPhysicalReportComposer
        designId={selectedDesign}
        pages={pages}
        context={context}
        previewCase={previewCaseData}
        fallbackPageLabel={normalizedTemplate.name || "التقارير"}
        renderMode="stack"
      />
    </section>
  );
}

import { buildFinalReportContext, normalizeFinalReportTemplate } from "./final-report";

import { getReportDesignLogoStyleText } from "./report-logo";



export function normalizeDesignId(value: string): ReportDesignId {
  return isReportDesignId(value) ? value : "ministry-form";
}
function getDesignName(designId: ReportDesignId) {
  return reportDesignTemplates.find((design) => design.id === designId)?.name || "تصميم رسمي";
}

