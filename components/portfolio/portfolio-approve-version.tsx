"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function PortfolioApproveVersion({
  busy,
  approved,
  onApprove,
  onOpenSavedCopies,
}: {
  busy: boolean;
  approved: boolean;
  onApprove: (input: { name: string; notes: string }) => void;
  onOpenSavedCopies: () => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-black text-slate-950">اعتماد النسخة</h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-black text-slate-700">
          اسم النسخة <span className="font-bold text-slate-400">(اختياري)</span>
          <input
            value={name}
            maxLength={180}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثال: نسخة نهاية الفصل الدراسي"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="text-sm font-black text-slate-700">
          ملاحظات <span className="font-bold text-slate-400">(اختياري)</span>
          <input
            value={notes}
            maxLength={2000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="ملاحظة قصيرة عن هذه النسخة"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onApprove({ name, notes })}
          className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          اعتماد وحفظ النسخة
        </button>
        {approved ? (
          <button
            type="button"
            onClick={onOpenSavedCopies}
            className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800"
          >
            عرض النسخ المحفوظة
          </button>
        ) : null}
      </div>
    </section>
  );
}
