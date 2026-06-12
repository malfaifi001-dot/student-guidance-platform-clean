"use client";

import type { ReportDocumentBlockInsertType } from "@/lib/report-engine/document-draft/report-document-types";

type ReportAddBlockMenuProps = {
  onAddBlock: (type: ReportDocumentBlockInsertType) => void;
};

const BLOCK_OPTIONS: Array<{
  type: ReportDocumentBlockInsertType;
  title: string;
  description: string;
}> = [
  {
    type: "PARAGRAPH",
    title: "فقرة",
    description: "عنوان ونص حر داخل التقرير.",
  },
  {
    type: "BULLET_LIST",
    title: "قائمة",
    description: "قائمة نقاط منظمة.",
  },
  {
    type: "TABLE",
    title: "جدول",
    description: "جدول قابل للتحكم بالصفوف والأعمدة.",
  },
];

export function ReportAddBlockMenu({ onAddBlock }: ReportAddBlockMenuProps) {
  return (
    <div className="rounded-[1.5rem] border border-emerald-100 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">إضافة بلوك</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            اختر نوع المحتوى الذي تريد إضافته للصفحة الحالية.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {BLOCK_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => onAddBlock(option.type)}
            className="group rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="text-sm font-black text-slate-900 group-hover:text-emerald-800">
              + {option.title}
            </div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              {option.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}