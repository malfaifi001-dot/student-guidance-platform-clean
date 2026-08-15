"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type Row = { id: string; title: string; value: string };

function newRow(id: number): Row {
  return {
    id: `row-${id}`,
    title: "",
    value: "",
  };
}

export function SimplePerformanceEntryBuilder({
  itemSlug,
  itemTitle,
  cancelHref,
}: {
  itemSlug: string;
  itemTitle: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const nextRowId = useRef(2);
  const [rows, setRows] = useState<Row[]>([newRow(1)]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  function updateRow(id: string, key: "title" | "value", value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/dashboard/principal/performance/${encodeURIComponent(itemSlug)}/entries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "simple",
            rows: rows.map(({ title, value }) => ({ title, value })),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر حفظ السجل.");
      }

      setFeedback({ tone: "success", text: result.message || "تم الحفظ." });
      window.setTimeout(() => {
        router.push(cancelHref);
        router.refresh();
      }, 500);
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "تعذر حفظ السجل.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir="rtl" className="space-y-6">
      <section className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-black text-teal-700 dark:text-teal-400">إدخال مبسط</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl dark:text-white">{itemTitle}</h1>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">
          لا يوجد Workflow منشور لهذا العنصر حاليًا. أضف بياناتك في صفوف عنوان وقيمة فقط.
        </p>
      </section>

      <form onSubmit={submit} className="space-y-4">
        {rows.map((row, index) => (
          <section key={row.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs font-black text-slate-400">الحقل {new Intl.NumberFormat("ar-SA").format(index + 1)}</span>
              <button
                type="button"
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="h-4 w-4" />
                إزالة
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">عنوان</span>
                <input
                  required
                  maxLength={180}
                  value={row.title}
                  onChange={(event) => updateRow(row.id, "title", event.target.value)}
                  placeholder="مثال: اسم المبادرة"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-teal-950"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">قيمة</span>
                <textarea
                  required
                  maxLength={5000}
                  rows={2}
                  value={row.value}
                  onChange={(event) => updateRow(row.id, "value", event.target.value)}
                  placeholder="مثال: مبادرة تحسين البيئة المدرسية"
                  className="min-h-12 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-teal-950"
                />
              </label>
            </div>
          </section>
        ))}

        {feedback ? (
          <div className={feedback.tone === "success" ? "rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700" : "rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700"}>
            {feedback.text}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => {
              const id = nextRowId.current++;
              setRows((current) => [...current, newRow(id)]);
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-5 text-sm font-black text-teal-800 transition hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300"
          >
            <Plus className="h-4 w-4" /> إضافة حقل
          </button>
          <div className="flex gap-2">
            <Link href={cancelHref} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 sm:flex-none dark:border-slate-700 dark:text-slate-200">إلغاء</Link>
            <button disabled={saving} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 text-sm font-black text-white transition hover:bg-teal-800 disabled:opacity-60 sm:flex-none">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
