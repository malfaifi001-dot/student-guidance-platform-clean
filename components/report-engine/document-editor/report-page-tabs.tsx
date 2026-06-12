"use client";

import type { ReportDocumentPage } from "@/lib/report-engine/document-draft/report-document-types";

type ReportPageTabsProps = {
  pages: ReportDocumentPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPageAfter: (pageId: string) => void;
  onRemovePage: (pageId: string) => void;
  onMovePage: (pageId: string, direction: "previous" | "next") => void;
};

export function ReportPageTabs({
  pages,
  activePageId,
  onSelectPage,
  onAddPageAfter,
  onRemovePage,
  onMovePage,
}: ReportPageTabsProps) {
  const activePage = pages.find((page) => page.id === activePageId) || pages[0];

  return (
    <div className="mb-3 flex items-center gap-2 overflow-x-auto rounded-[1.5rem] border border-emerald-100 bg-white/80 p-2 print:hidden">
      <span className="shrink-0 px-2 text-xs font-black text-slate-500">
        صفحات التقرير
      </span>

      <button
        type="button"
        onClick={() => activePage && onAddPageAfter(activePage.id)}
        className="shrink-0 rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800"
      >
        + صفحة
      </button>

      {pages.map((page, index) => {
        const active = page.id === activePageId;
        const manual = page.kind === "MANUAL";

        return (
          <div
            key={page.id}
            className={[
              "inline-flex shrink-0 items-center gap-1 rounded-2xl px-2 py-1 transition",
              active
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => onSelectPage(page.id)}
              className="px-2 py-1 text-xs font-black"
              title={page.title}
            >
              {page.title || `صفحة ${index + 1}`}
            </button>

            <button
              type="button"
              onClick={() => onMovePage(page.id, "previous")}
              className="rounded-full px-1 text-[10px] font-black opacity-80 hover:bg-black/10 disabled:opacity-30"
              disabled={index === 0}
              title="تحريك للخلف"
            >
              ›
            </button>

            <button
              type="button"
              onClick={() => onMovePage(page.id, "next")}
              className="rounded-full px-1 text-[10px] font-black opacity-80 hover:bg-black/10 disabled:opacity-30"
              disabled={index === pages.length - 1}
              title="تحريك للأمام"
            >
              ‹
            </button>

            {manual ? (
              <button
                type="button"
                onClick={() => onRemovePage(page.id)}
                className={[
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
                ].join(" ")}
                title="حذف الصفحة"
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}