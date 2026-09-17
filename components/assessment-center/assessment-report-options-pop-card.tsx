"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS, type CounselorAssessmentReportVisibilityOptions } from "@/lib/assessment-center/assessment-report-options";

const fields: Array<{ key: Exclude<keyof CounselorAssessmentReportVisibilityOptions, "version">; label: string }> = [
  { key: "topTenStudents", label: "العشرة الأوائل" }, { key: "bottomTenStudents", label: "العشرة الأقل أداءً" },
  { key: "bestSubject", label: "أفضل مادة" }, { key: "weakestSubject", label: "أضعف مادة" },
  { key: "riskStudents", label: "الطلاب المحتاجون متابعة" }, { key: "subjectComparison", label: "مقارنة المواد" },
  { key: "classroomComparison", label: "مقارنة الفصول" },
];

export function AssessmentReportOptionsPopCard({ analysisId }: { analysisId: string }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS);
  const [draft, setDraft] = useState(DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "warning">("error");

  useEffect(() => {
    if (!open) return;
    setLoading(true); setMessage("");
    fetch(`/api/dashboard/assessment-center/${analysisId}/report-options`, { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => null) }))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload?.error || "تعذر تحميل خيارات التقرير.");
        setOptions(payload.options); setDraft(payload.options);
        if (payload.warning) { setMessage(payload.warning); setMessageTone("warning"); }
      })
      .catch((error) => { setMessageTone("error"); setMessage(error instanceof Error ? error.message : "تعذر تحميل خيارات التقرير."); })
      .finally(() => setLoading(false));
  }, [analysisId, open]);

  async function save() {
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/dashboard/assessment-center/${analysisId}/report-options`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error === "REPORT_OPTIONS_SCHEMA_PENDING"
          ? "يلزم تطبيق ترقية قاعدة البيانات لحفظ خيارات التقرير."
          : "تعذر حفظ خيارات التقرير.");
      }
      setOptions(payload.options); setDraft(payload.options); setOpen(false);
    } catch (error) {
      setMessageTone("error"); setMessage(error instanceof Error ? error.message : "تعذر حفظ خيارات التقرير.");
    } finally { setLoading(false); }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/20"><Settings2 className="h-4 w-4" />تخصيص التحليل</button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" dir="rtl"><section className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"><header><h2 className="text-xl font-black text-slate-950">تخصيص التحليل</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-500">اختر المؤشرات التي تريد تضمينها في التقرير.</p></header><div className="mt-5 grid gap-2 sm:grid-cols-2">{fields.map(({ key, label }) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm font-black text-slate-700 transition hover:border-cyan-300"><input type="checkbox" checked={draft[key]} disabled={loading} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-cyan-600" />{label}</label>)}</div>{message ? <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${messageTone === "warning" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>{message}</p> : null}<footer className="mt-6 flex flex-wrap gap-2"><button type="button" disabled={loading} onClick={() => setDraft({ ...DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS })} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">تحديد الكل</button><button type="button" disabled={loading} onClick={() => setDraft({ ...DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS, topTenStudents: false, bottomTenStudents: false, bestSubject: false, weakestSubject: false, riskStudents: false, subjectComparison: false, classroomComparison: false })} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">إلغاء الكل</button><span className="flex-1" /><button type="button" disabled={loading} onClick={() => { setDraft(options); setOpen(false); }} className="rounded-xl px-4 py-2 text-xs font-black text-slate-600">إلغاء</button><button type="button" disabled={loading} onClick={() => void save()} className="rounded-xl bg-cyan-700 px-5 py-2 text-xs font-black text-white disabled:opacity-60">{loading ? "جارٍ الحفظ..." : "حفظ"}</button></footer></section></div> : null}
  </>;
}
