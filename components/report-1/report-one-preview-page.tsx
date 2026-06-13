"use client";

import Link from "next/link";
import { useState } from "react";

import { ReportOneTemplatePreview } from "@/components/report-1/editor/report-one-template-preview";
import type {
  ReportOneDocumentDraft,
  ReportOneEditorPage,
  ReportOneEvidenceSettings,
} from "@/components/report-1/editor/report-one-editor-types";

type ReportOnePreviewPageProps = {
  reportId: string;
  status: string;
  draft: ReportOneDocumentDraft;
  pdfMode?: boolean;
};

function getSafePages(draft: ReportOneDocumentDraft): ReportOneEditorPage[] {
  if (draft.pages?.length) return draft.pages;

  return [
    {
      id: "report-one-page-1",
      title: "1. صفحة العنوان والمحتوى",
      kind: "content",
      sourceTemplatePageId: null,
    },
  ];
}


function getSafeEvidenceSettings(draft: ReportOneDocumentDraft): ReportOneEvidenceSettings {
  return (
    draft.evidenceSettings || {
      enabled: true,
      perPage: 2,
      showCaptions: false,
      fit: "contain",
      aspectRatio: "SQUARE_1_1",
      sizePreset: "NORMAL_82_82",
      imageWidthMm: 82,
      imageHeightMm: 82,
      gapMm: 4,
    }
  );
}
export function ReportOnePreviewPage({
  reportId,
  status,
  draft,
  pdfMode = false,
}: ReportOnePreviewPageProps) {
  const visibleFields = draft.fields.filter((field) => field.visible);
  const pages = getSafePages(draft);
  const evidenceSettings = getSafeEvidenceSettings(draft);
  const [activePageId, setActivePageId] = useState(
    draft.activePageId || pages[0]?.id || "report-one-page-1",
  );

  return (
    <main
      className={pdfMode ? "bg-white" : "min-h-screen bg-[#eef3ef] px-6 py-6"}
      dir="rtl"
    >
      {!pdfMode ? (
        <section className="mx-auto mb-5 flex max-w-7xl flex-col gap-4 rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between print:hidden">
          <div>
            <p className="text-sm font-black text-emerald-700">
              معاينة report-1
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950">
              {draft.title}
            </h1>

            <p className="mt-2 text-xs font-black text-slate-500">
              حالة التقرير: {status}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href={`/dashboard/report-1/${reportId}/studio`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              العودة للمحرر
            </Link>

            <Link
              href={`/api/dashboard/report-1/${reportId}/export/pdf?inline=true`}
              target="_blank"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
            >
              عرض PDF
            </Link>

            <Link
              href={`/api/dashboard/report-1/${reportId}/export/pdf`}
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800"
            >
              تحميل PDF
            </Link>
          </div>
        </section>
      ) : null}

      <div className={pdfMode ? "" : "mx-auto max-w-7xl"}>
        <ReportOneTemplatePreview
          title={draft.title}
          template={draft.template}
          payload={draft.payload}
          fields={visibleFields}
          blocks={draft.blocks}
          pages={pages}
          evidenceSettings={evidenceSettings}
          activePageId={activePageId}
          onActivePageChange={setActivePageId}
          onAddPage={() => undefined}
          onDeletePage={() => undefined}
          onPageOverflow={() => undefined}
          onActiveBlockChange={() => undefined}
        />
      </div>
    </main>
  );
}