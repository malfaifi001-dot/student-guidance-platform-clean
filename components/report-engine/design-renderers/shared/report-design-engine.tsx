"use client";

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

  const logoWidthPx = getDesignLogoNumber(
    context,
    "report.logoWidthPx",
    implementation.defaultLogoWidthPx || 96,
    24,
    240,
  );

  const logoHeightPx = getDesignLogoNumber(
    context,
    "report.logoHeightPx",
    implementation.defaultLogoHeightPx || 56,
    20,
    160,
  );

  const logoFit = getDesignLogoFit(context);
  const logoFilter = getDesignLogoFilter(context);
  const headerStyleText = getReportHeaderSettingsStyle(
    template?.designConfig?.header,
  );
  const signatureStyleText = getReportDesignSignatureStyleText();
  const pages = template?.pages || [];

  const logoStyle = (
    <style>{`
      .report-design-logo-control-style img[alt="شعار وزارة التعليم"],
      .pdf-report-page img[alt="شعار وزارة التعليم"] {
        width: ${logoWidthPx}px !important;
        max-width: ${logoWidthPx}px !important;
        height: ${logoHeightPx}px !important;
        max-height: ${logoHeightPx}px !important;
        object-fit: ${logoFit} !important;
        filter: ${logoFilter} !important;
      }
    `}</style>
  );
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
        {pages.map((page: any, index: number) => {
          const active = page.id === activePageId;
          const canMovePrevious =
            canMovePage?.(page.id, "previous") ?? index > 0;
          const canMoveNext =
            canMovePage?.(page.id, "next") ?? index < pages.length - 1;
          const canDelete = canDeletePage?.(page.id) ?? false;

          return (
            <div
              key={`${page.id}-${index}`}
              className={[
                "inline-flex items-center gap-1 rounded-2xl border px-2 py-1 text-xs font-black transition",
                active
                  ? "border-emerald-600 bg-emerald-700 text-white shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => onActivePageChange(page.id)}
                className="max-w-[220px] truncate px-2 py-1"
                title={page.title}
              >
                {index + 1}. {page.title}
              </button>

              {active ? (
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
      {renderMode === "stack" ? (
        <div className="space-y-6">
          {pages.map((page: any, index: number) => (
            <div key={page.id} data-report-design-page-index={index}>
              <A4DesignPage
                designId={selectedDesign}
                page={page}
                context={context}
                previewCase={previewCase}
                pageLabel={page?.title || "صفحة"}
              />
            </div>
          ))}
        </div>
      ) : (
        <A4DesignPage
          designId={selectedDesign}
          page={activePage}
          context={context}
          previewCase={previewCase}
          pageLabel={activePage?.title || "صفحة"}
        />
      )}

      {!suppressAutoEvidencePages ? (
        <AutoEvidencePages
          designId={selectedDesign}
          activePage={activePage}
          context={context}
          previewCase={previewCase}
        />
      ) : null}
    </div>
  );

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
      {pages.map((page: any) => (
        <div key={page.id} className="break-after-page print:break-after-page">
          <A4DesignPage
            designId={selectedDesign}
            page={page}
            context={context}
            previewCase={previewCaseData}
            pageLabel={page.title || normalizedTemplate.name || "التقارير"}
          />

          <AutoEvidencePages
            designId={selectedDesign}
            activePage={page}
            context={context}
            previewCase={previewCaseData}
          />
        </div>
      ))}
    </section>
  );
}

import { buildFinalReportContext, normalizeFinalReportTemplate } from "./final-report";

import { getDesignLogoFilter, getDesignLogoFit, getDesignLogoNumber } from "./report-logo";

import { SmartReportPageComposer } from "../smart-layout/report-smart-page-composer";
import { AutoEvidencePages } from "./report-auto-evidence";
import { A4DesignPage } from "./report-blocks";

export function normalizeDesignId(value: string): ReportDesignId {
  return isReportDesignId(value) ? value : "ministry-form";
}
function getDesignName(designId: ReportDesignId) {
  return reportDesignTemplates.find((design) => design.id === designId)?.name || "تصميم رسمي";
}

