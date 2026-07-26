"use client";

import { Archive, ChevronDown } from "lucide-react";
import { useState } from "react";

import { WorkflowHistoryCard, type WorkflowHistoryItem } from "@/components/admin/workflows/workflow-history-card";

export function WorkflowHistorySection({ serviceSlug, workflows }: { serviceSlug: string; workflows: WorkflowHistoryItem[] }) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const sorted = [...workflows].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.version - a.version;
  });
  const current = sorted.filter((workflow) => workflow.isActive || workflow.status === "DRAFT");
  const archived = sorted.filter((workflow) => !workflow.isActive && workflow.status !== "DRAFT");

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-sky-700">سجل المرفوعات السابقة</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">كل Workflows المحفوظة لهذه الخدمة</h2>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
            النسخ المفعلة والمسودات ظاهرة مباشرة، بينما تحفظ النسخ غير الحالية داخل الأرشيف.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">{sorted.length} نسخ محفوظة</span>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">{current.length} حالية</span>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">{archived.length} مؤرشفة</span>
        </div>
      </div>

      {sorted.length ? (
        <>
          {current.length ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {current.map((workflow) => <WorkflowHistoryCard key={workflow.id} serviceSlug={serviceSlug} workflow={workflow} />)}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm font-bold text-amber-700">لا توجد نسخة مفعلة أو مسودة حالية.</p>
          )}

          {archived.length ? (
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setArchiveOpen((value) => !value)}
                aria-expanded={archiveOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-right transition hover:bg-slate-100"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-2xl bg-white p-3 text-slate-500 ring-1 ring-slate-200"><Archive className="h-5 w-5" /></span>
                  <span>
                    <strong className="block text-lg font-black text-slate-900">النسخ المؤرشفة</strong>
                    <span className="text-xs font-bold text-slate-500">{archived.length} نسخ مؤرشفة · {archiveOpen ? "إخفاء النسخ المؤرشفة" : "إظهار النسخ المؤرشفة"}</span>
                  </span>
                </span>
                <ChevronDown className={["h-5 w-5 text-slate-500 transition", archiveOpen ? "rotate-180" : ""].join(" ")} />
              </button>

              {archiveOpen ? (
                <div className="grid gap-4 border-t border-slate-200 p-4 xl:grid-cols-2">
                  {archived.map((workflow) => <WorkflowHistoryCard key={workflow.id} serviceSlug={serviceSlug} workflow={workflow} archived />)}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h3 className="text-xl font-black text-slate-800">لا توجد مرفوعات محفوظة بعد</h3>
          <p className="mt-2 text-sm font-bold text-slate-500">ارفع ملف Excel واحفظه كمسودة حتى يظهر هنا.</p>
        </div>
      )}
    </section>
  );
}
