"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";

type ContentType = "INTRODUCTION" | "CONCLUSION";
type TextLength = "SHORT" | "MEDIUM" | "LONG";
type TextTone = "FORMAL" | "PEDAGOGICAL" | "EDUCATIONAL";

const lengthOptions: Array<{ value: TextLength; label: string }> = [
  { value: "SHORT", label: "قصير" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "LONG", label: "طويل" },
];

const toneOptions: Array<{ value: TextTone; label: string }> = [
  { value: "FORMAL", label: "رسمي" },
  { value: "PEDAGOGICAL", label: "تربوي" },
  { value: "EDUCATIONAL", label: "تعليمي" },
];

export function PortfolioTextSuggestionPopCard({
  contentType,
  currentText,
  disabled,
  onUse,
}: {
  contentType: ContentType;
  currentText: string;
  disabled?: boolean;
  onUse: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [length, setLength] = useState<TextLength>("MEDIUM");
  const [tone, setTone] = useState<TextTone>("EDUCATIONAL");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const fieldLabel = contentType === "INTRODUCTION" ? "المقدمة" : "الخاتمة";

  function close() {
    if (loading) return;
    setOpen(false);
    setSuggestion("");
    setError("");
    setConfirmReplace(false);
  }

  async function generate() {
    setLoading(true);
    setError("");
    setConfirmReplace(false);

    try {
      const response = await fetch("/api/dashboard/portfolio/text-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, length, tone }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.text !== "string" || !result.text.trim()) {
        throw new Error("تعذر توليد النص حاليًا، حاول مرة أخرى.");
      }
      setSuggestion(result.text.trim());
    } catch {
      setError("تعذر توليد النص حاليًا، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  function useSuggestion() {
    if (!suggestion) return;
    if (currentText.trim() && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    onUse(suggestion);
    close();
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" /> اقتراح نص
      </button>

      {open ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" dir="rtl">
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">اقتراح نص</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">حدد طول النص وأسلوبه، وسنقترح لك صياغة جاهزة لـ{fieldLabel}.</p>
              </div>
              <button type="button" onClick={close} disabled={loading} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50" aria-label="إغلاق"><X className="h-5 w-5" /></button>
            </header>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-2 text-sm font-black text-slate-700">طول النص</legend>
                <div className="grid grid-cols-3 gap-2">
                  {lengthOptions.map((option) => <button key={option.value} type="button" disabled={loading} onClick={() => setLength(option.value)} className={`rounded-xl border px-3 py-2.5 text-sm font-black transition ${length === option.value ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{option.label}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-black text-slate-700">أسلوب الكتابة</legend>
                <div className="grid grid-cols-3 gap-2">
                  {toneOptions.map((option) => <button key={option.value} type="button" disabled={loading} onClick={() => setTone(option.value)} className={`rounded-xl border px-3 py-2.5 text-sm font-black transition ${tone === option.value ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{option.label}</button>)}
                </div>
              </fieldset>
            </div>

            <button type="button" onClick={() => void generate()} disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-800 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "جارٍ توليد النص..." : "توليد النص"}
            </button>

            {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{error}</p> : null}
            {suggestion ? (
              <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <p className="whitespace-pre-wrap text-sm font-bold leading-8 text-slate-800">{suggestion}</p>
                {confirmReplace ? <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black leading-6 text-amber-800">سيتم استبدال النص الحالي في {fieldLabel}. هل تريد المتابعة؟</p> : null}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => void generate()} disabled={loading} className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-xs font-black text-violet-700 disabled:opacity-50">إعادة التوليد</button>
                  {confirmReplace ? <button type="button" onClick={() => setConfirmReplace(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600">إلغاء</button> : null}
                  <button type="button" onClick={useSuggestion} disabled={loading} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{confirmReplace ? "تأكيد الاستبدال" : "استخدام النص"}</button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={close} disabled={loading} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100 disabled:opacity-50">إغلاق</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
