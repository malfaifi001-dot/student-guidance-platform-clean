"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
  isReportDesignId,
  selectableReportDesignTemplates,
} from "../report-design-registry";
import { getReportDesignImplementation } from "../report-design-implementations";
import type { ReportDesignId } from "../report-design-types";

export {
  DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
  reportDesignTemplates,
  selectableReportDesignTemplates,
  SELECTABLE_REPORT_DESIGN_IDS,
  isSelectableReportDesignId,
} from "../report-design-registry";
export type { ReportDesignId } from "../report-design-types";

import { getReportHeaderSettingsStyle } from "./report-header";
import type { PreviewCaseData, ReportDesignRendererProps } from "./report-types";

import { getReportDesignSignatureStyleText } from "./report-signatures";
import { PhysicalLayoutRuntime } from "@/components/report-engine/physical-layout/physical-layout-runtime";
import type { ReportTwoPhysicalNavigationItem } from "../smart-layout/report-smart-physical-types";


export function ReportDesignRenderer({
  designId,
  template,
  activePage,
  activePageId,
  context,
  previewCase,
  onDesignChange,
  onActivePageChange,
  onAddPage,
  onMovePage,
  onDeletePage,
  canMovePage,
  canDeletePage,
  renderMode = "single",
  chromeLayout = "joined",
  suppressAutoEvidencePages = false,
  showAddPageControl = true,
  useMobileDesignSelect = false,
  physicalLayoutLoadingLabel,
  showPhysicalLayoutLoadingWhilePreparing = false,
  onPhysicalLayoutReady,
}: ReportDesignRendererProps & {
  showAddPageControl?: boolean;
  useMobileDesignSelect?: boolean;
  physicalLayoutLoadingLabel?: string;
  showPhysicalLayoutLoadingWhilePreparing?: boolean;
  onPhysicalLayoutReady?: (designId: ReportDesignId) => void;
}) {
  const selectedDesign = normalizeDesignId(
    designId || template?.designTemplateId || DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
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

  useEffect(() => {
    setPhysicalNavigationItems([]);
    setActivePhysicalPageId("");
  }, [pages, selectedDesign]);

  const handlePhysicalPagesChange = useCallback(
    (items: ReportTwoPhysicalNavigationItem[]) => {
      setPhysicalNavigationItems((current) => {
        const currentKey = current
          .map((item) => `${item.physicalPageId}:${item.label}`)
          .join("|");

        const nextKey = items
          .map((item) => `${item.physicalPageId}:${item.label}`)
          .join("|");

        return currentKey === nextKey
          ? current
          : items;
      });

      setActivePhysicalPageId((current) => {
        const currentItem = items.find(
          (item) =>
            item.physicalPageId === current,
        );

        /**
         * إذا المستخدم اختار صفحة فيزيائية بنفسه،
         * حافظ عليها ما دامت تخص Logical Page الحالية.
         */
        if (
          currentItem?.sourcePageIds.includes(
            activePageId,
          )
        ) {
          return current;
        }

        /**
         * دائمًا ابدأ من Physical Page الأولى
         * للـ Logical Page الحالية.
         *
         * لا Auto-surface للشواهد أو التوقيع.
         */
        return (
          items.find(
            (item) =>
              item.sourcePageIds.includes(
                activePageId,
              ) &&
              item.physicalIndexWithinLogicalPage === 1,
          )?.physicalPageId ||
          items.find(
            (item) =>
              item.sourcePageIds.includes(
                activePageId,
              ),
          )?.physicalPageId ||
          items[0]?.physicalPageId ||
          ""
        );
      });
    },
    [activePageId],
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
  const selectedDesignDefinition = selectableReportDesignTemplates.find(
    (design) => design.id === selectedDesign,
  );
  const previewHeading = selectedDesignDefinition
    ? selectedDesignDefinition.name.replace(
        /^التصميم/,
        "المعاينة للتصميم",
      )
    : "معاينة التقرير";

  const controls = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-right">
          <h2 className="text-lg font-black text-slate-900">
            {previewHeading}
          </h2>
        </div>
      </div>

      <div
        className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        dir="rtl"
      >
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

          {showAddPageControl ? (
            <button
              type="button"
              onClick={onAddPage}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
            >
              + صفحة محتوى
            </button>
          ) : null}
        </div>

        {onDesignChange ? (
          <div className="min-w-0 lg:text-left">
            {useMobileDesignSelect ? (
              <label className="block min-w-0 sm:hidden">
                <span className="mb-1.5 block text-[11px] font-black text-slate-500">
                  اختيار التصميم
                </span>
                <select
                  value={selectedDesign}
                  onChange={(event) =>
                    onDesignChange(event.target.value as ReportDesignId)
                  }
                  className="block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  {selectableReportDesignTemplates.map((design) => (
                    <option key={design.id} value={design.id}>
                      {design.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

          <div data-report-design-switcher="true" className={[
            "flex flex-wrap items-center gap-2 lg:justify-end",
            useMobileDesignSelect ? "hidden sm:flex" : "",
          ].join(" ")}>
            {selectableReportDesignTemplates.map((design) => {
              const active = design.id === selectedDesign;

              return (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => onDesignChange(design.id)}
                  className={[
                    "rounded-2xl border px-4 py-2 text-xs font-black transition",
                    active
                      ? "border-emerald-600 bg-emerald-700 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {design.name}
                </button>
              );
            })}
          </div>
          </div>
        ) : null}
      </div>
    </>
  );

  const preview = (
    <div className="report-design-logo-control-style">
      <PhysicalLayoutRuntime
        designId={selectedDesign}
        pages={pages}
        activePageId={activePageId}
        activePhysicalPageId={activePhysicalPageId}
        context={context}
        previewCase={previewCase}
        fallbackPageLabel={activePage?.title || "التقرير"}
        renderMode={renderMode}
        onPhysicalPagesChange={handlePhysicalPagesChange}
        loadingLabel={physicalLayoutLoadingLabel}
        showLoadingWhilePreparing={showPhysicalLayoutLoadingWhilePreparing}
        onPhysicalLayoutReady={onPhysicalLayoutReady}
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
    template?.designTemplateId ||
      template?.designTheme ||
      DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
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
      <PhysicalLayoutRuntime
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
  return isReportDesignId(value) ? value : DEFAULT_SELECTABLE_REPORT_DESIGN_ID;
}

