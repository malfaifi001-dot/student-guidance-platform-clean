"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Send, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  TEACHER: "معلم/ة",
  ACTIVITY_LEADER: "رائد/ة نشاط",
  COUNSELOR: "موجه/ة طلابية",
  STAFF: "منسوب/ة مدرسة",
};

export function SendPerformanceAssignmentCard({
  itemSlug,
  itemTitle,
  members,
  endpoint,
}: {
  itemSlug: string;
  itemTitle: string;
  members: Member[];
  endpoint?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(
        endpoint ||
          `/api/dashboard/principal/performance/${encodeURIComponent(itemSlug)}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeId, title, note, dueDate }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "تعذر إرسال التكليف.");
      setFeedback({ tone: "success", text: result.message });
      setAssigneeId("");
      setTitle("");
      setNote("");
      setDueDate("");
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "تعذر إرسال التكليف." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setFeedback(null); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-6 text-sm font-black text-white transition hover:bg-white/25">
        <Send className="h-4 w-4" /> إرسال تكليف
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="performance-assignment-title" dir="rtl" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/60 bg-white text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 dark:border-slate-800">
              <div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700 dark:bg-teal-950 dark:text-teal-300">{itemTitle}</span>
                <h2 id="performance-assignment-title" className="mt-3 text-2xl font-black text-slate-950 dark:text-white">إرسال تكليف داخلي</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">سيظهر التكليف للمنسوب داخل حسابه في تكليفاتي.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"><X className="h-5 w-5" /></button>
            </header>
            <form
              onSubmit={submit}
              className="space-y-4 p-5 text-slate-950 sm:p-6 dark:text-white [&_input]:text-inherit [&_select]:text-inherit [&_textarea]:text-inherit [&_input]:placeholder:text-slate-400 [&_textarea]:placeholder:text-slate-400 [&_option]:bg-white [&_option]:text-slate-950 dark:[&_option]:bg-slate-900 dark:[&_option]:text-white [&_:disabled]:cursor-not-allowed [&_:disabled]:text-slate-400 dark:[&_:disabled]:text-slate-500"
            >
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"><UserRound className="h-4 w-4" /> المنسوب</span>
                <select required value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900">
                  <option value="">اختر من منسوبي المدرسة</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name} — {ROLE_LABELS[member.role] || member.role}</option>)}
                </select>
              </label>
              {!members.length ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-black text-amber-800">لا يوجد منسوبون مؤهلون مرتبطون بهذه المدرسة حاليًا.</p> : null}
              <label className="block"><span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">عنوان التكليف (اختياري)</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900" placeholder="مثال: تزويدي بتقرير المبادرة" /></label>
              <label className="block"><span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">ملاحظة (اختياري)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={3000} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900" /></label>
              <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"><CalendarDays className="h-4 w-4" /> تاريخ التسليم (اختياري)</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900" /></label>
              {feedback ? <div className={feedback.tone === "success" ? "rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700" : "rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700"}>{feedback.text}</div> : null}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row dark:border-slate-800">
                <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200">إلغاء</button>
                <button disabled={saving || !members.length} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} إرسال التكليف</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
