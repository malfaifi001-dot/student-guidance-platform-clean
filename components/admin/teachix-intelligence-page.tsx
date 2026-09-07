"use client";

import { FormEvent, useState } from "react";
import { BrainCircuit, Loader2, Send } from "lucide-react";

const examples = ["حلل لي المنصة آخر 7 أيام.", "ما أكثر workflow مستخدم؟", "قارن استخدام المعلمين هذا الأسبوع بالأسبوع الماضي.", "هل فيه مشاكل تقنية أثرت على الاستخدام؟"];

export function TeachixIntelligencePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState(false);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [trace, setTrace] = useState<Array<{ round: number; tool: string; durationMs: number; success: boolean; cache: string; result: { bytes: number; items?: number } }>>([]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true); setError("");
    try {
      const currentQuestion = question.trim();
      const response = await fetch("/api/dashboard/admin/teachix-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: currentQuestion, debug, history }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "تعذر تشغيل التحليل.");
      setAnswer(payload.answer || "");
      setHistory((items) => [...items, { role: "user" as const, content: currentQuestion }, { role: "assistant" as const, content: String(payload.answer || "") }].slice(-4));
      setTrace(payload.trace || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تشغيل التحليل."); }
    finally { setLoading(false); }
  }

  return <main className="space-y-5" dir="rtl">
    <section className="rounded-3xl border border-sky-200 bg-gradient-to-l from-slate-950 to-sky-950 p-6 text-white shadow-sm">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><BrainCircuit /></span><div><p className="text-xs font-black text-sky-200">تحليل المنصة</p><h1 className="text-3xl font-black">Teachix Intelligence</h1></div></div>
      <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-slate-300">اسأل عن استخدام المنصة، الخدمات، الأدوار، مسارات العمل، التقارير، الاشتراكات أو المشاكل التشغيلية. يستخدم التحليل بيانات Teachix الحالية للقراءة فقط.</p>
      <form onSubmit={submit} className="mt-5 flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="اسأل عن منصتك..." className="min-w-0 flex-1 rounded-2xl border-0 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none" /><button disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black hover:bg-sky-400 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} إرسال</button></form>
      <div className="mt-4 flex flex-wrap items-center gap-2">{examples.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)} className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-white/15">{item}</button>)}<label className="mr-auto inline-flex items-center gap-2 text-xs font-bold text-sky-100"><input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} />تشخيص الأدوات</label></div>
    </section>
    {error ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</section> : null}
    {answer ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="text-lg font-black text-slate-950 dark:text-white">التحليل</h2><div className="mt-4 whitespace-pre-wrap text-sm font-bold leading-8 text-slate-700 dark:text-slate-200">{answer}</div></section> : null}
    {debug && trace.length ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="text-lg font-black text-slate-950 dark:text-white">تشخيص الأدوات</h2><div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{trace.map((item, index) => <div key={`${item.tool}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"><span>الجولة {item.round} · {item.tool}</span><span>{item.success ? "نجاح" : "فشل"} · {item.cache} · {item.durationMs}ms · {item.result.items ?? 0} عنصر · {item.result.bytes}B</span></div>)}</div></section> : null}
  </main>;
}
