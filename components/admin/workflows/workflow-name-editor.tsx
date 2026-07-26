"use client";

import { CheckCircle2, Loader2, PencilLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  serviceSlug: string;
  workflowId: string;
  currentName: string;
};

export function WorkflowNameEditor({ serviceSlug, workflowId, currentName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function closeEditor() {
    if (saving) return;
    setOpen(false);
    setName(currentName);
    setError(null);
    setSuccess(null);
  }

  async function saveName() {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const response = await fetch(
        `/api/dashboard/admin/workflows/${encodeURIComponent(serviceSlug)}/rename`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflowId, name: trimmedName }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تعديل الاسم.");

      setName(data.workflow?.name || trimmedName);
      setSuccess(data.message || "تم تعديل اسم Workflow بنجاح.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "حدث خطأ غير متوقع.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-xl font-black leading-8 text-slate-950">
          {currentName}
        </h3>
        <button
          type="button"
          onClick={() => {
            setName(currentName);
            setError(null);
            setSuccess(null);
            setOpen(true);
          }}
          title="تحرير الاسم"
          aria-label={`تحرير اسم ${currentName}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
        >
          <PencilLine className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" dir="rtl">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-sky-700">تحرير الاسم</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">تعديل اسم Workflow</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                  يتغير اسم العرض فقط دون التأثير على النسخة أو الحالات المرتبطة.
                </p>
              </div>
              <button type="button" onClick={closeEditor} aria-label="إغلاق" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              autoFocus
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveName();
                if (event.key === "Escape") closeEditor();
              }}
              className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <p className="mt-2 text-left text-[11px] font-bold text-slate-400">{name.length}/160</p>

            {error ? <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
            {success ? (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> {success}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeEditor} disabled={saving} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 disabled:opacity-50">
                إلغاء
              </button>
              <button type="button" onClick={saveName} disabled={saving || !name.trim() || name.trim() === currentName} className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
                حفظ الاسم
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
