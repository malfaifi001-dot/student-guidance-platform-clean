"use client";

import type { ReactNode } from "react";
import type { ReportDocumentBlock } from "@/lib/report-engine/document-draft/report-document-types";

type ReportBlockFrameProps = {
  block: ReportDocumentBlock;
  selected?: boolean;
  children: ReactNode;
  onSelect: () => void;
  onRemove: () => void;
  onMovePrevious: () => void;
  onMoveNext: () => void;
  onEditTable?: () => void;
};

function getBlockLabel(block: ReportDocumentBlock) {
  if (block.type === "META_FIELDS") return "بيانات التقرير";
  if (block.type === "NARRATIVE") return "وصف التنفيذ";
  if (block.type === "PARAGRAPH") return "فقرة";
  if (block.type === "BULLET_LIST") return "قائمة";
  if (block.type === "TABLE") return "جدول";
  if (block.type === "EVIDENCE") return "الشواهد";
  if (block.type === "SIGNATURES") return "الاعتمادات";

  return "بلوك";
}

export function ReportBlockFrame({
  block,
  selected = false,
  children,
  onSelect,
  onRemove,
  onMovePrevious,
  onMoveNext,
  onEditTable,
}: ReportBlockFrameProps) {
  return (
    <section
      onClick={onSelect}
      className={[
        "group rounded-[1.25rem] border bg-white p-3 transition",
        selected
          ? "border-emerald-300 shadow-sm ring-2 ring-emerald-100"
          : "border-slate-100 hover:border-emerald-200",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between gap-3 print:hidden">
        <div className="inline-flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-800">
            {getBlockLabel(block)}
          </span>

          {block.locked ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
              ثابت
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          {block.type === "TABLE" ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEditTable?.();
              }}
              className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-800 hover:bg-emerald-100"
            >
              تحرير الجدول
            </button>
          ) : null}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMovePrevious();
            }}
            className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600 hover:bg-slate-100"
            title="تحريك للأعلى"
          >
            ↑
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveNext();
            }}
            className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600 hover:bg-slate-100"
            title="تحريك للأسفل"
          >
            ↓
          </button>

          {!block.locked ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-600 hover:bg-rose-100"
              title="حذف"
            >
              حذف
            </button>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}