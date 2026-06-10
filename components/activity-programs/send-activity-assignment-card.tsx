"use client";

import { useState } from "react";
import { Copy, Loader2, MessageCircle, Send } from "lucide-react";

type Props = {
  domainSlug: string;
  domainTitle: string;
};

type CreatedAssignment = {
  id: string;
  teacherName: string;
  teacherPhone: string;
  domainTitle: string;
  status: string;
  publicUrl: string;
  whatsappUrl: string;
};

export function SendActivityAssignmentCard({ domainSlug, domainTitle }: Props) {
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState<CreatedAssignment | null>(null);
  const [error, setError] = useState("");

  async function copyLink() {
    if (!assignment?.publicUrl) return;

    await navigator.clipboard.writeText(assignment.publicUrl);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAssignment(null);

    try {
      const response = await fetch("/api/dashboard/activity-leader/teacher-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainSlug,
          teacherName,
          teacherPhone,
          teacherEmail,
          dueDate,
          note,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر إنشاء رابط المعلم.");
      }

      setAssignment(result.assignment);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إنشاء رابط المعلم."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm" dir="rtl">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black text-sky-700">تكليف معلم</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            إرسال نشاط لمعلم
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
            ينشأ رابط بسيط للجوال، ثم ترسله للمعلم عبر واتساب. لا يتم إنشاء حالة إلا بعد إرسال المعلم للنموذج.
          </p>
        </div>

        <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
          {domainTitle}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 md:grid-cols-2">
        <Field label="اسم المعلم">
          <input
            value={teacherName}
            onChange={(event) => setTeacherName(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
            placeholder="مثال: محمد علي"
          />
        </Field>

        <Field label="رقم واتساب">
          <input
            value={teacherPhone}
            onChange={(event) => setTeacherPhone(event.target.value)}
            required
            inputMode="tel"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
            placeholder="05xxxxxxxx"
          />
        </Field>

        <Field label="البريد الإلكتروني اختياري">
          <input
            value={teacherEmail}
            onChange={(event) => setTeacherEmail(event.target.value)}
            type="email"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
            placeholder="teacher@example.com"
          />
        </Field>

        <Field label="تاريخ التسليم اختياري">
          <input
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            type="date"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="ملاحظة قصيرة للمعلم اختياري">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
              placeholder="مثال: فضلاً رفع صورتين واضحتين من تنفيذ النشاط."
            />
          </Field>
        </div>

        {error ? (
          <div className="md:col-span-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
            {error}
          </div>
        ) : null}

        <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            إنشاء رابط المعلم
          </button>

          <a
            href="/dashboard/activity-leader/teacher-assignments"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            متابعة أنشطة المعلمين
          </a>
        </div>
      </form>

      {assignment ? (
        <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-800">
            تم إنشاء الرابط بنجاح للأستاذ/ة {assignment.teacherName}
          </p>

          <div className="mt-3 break-all rounded-2xl bg-white px-4 py-3 text-left text-xs font-bold text-slate-600" dir="ltr">
            {assignment.publicUrl}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={assignment.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              إرسال عبر واتساب
            </a>

            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
            >
              <Copy className="h-4 w-4" />
              نسخ الرابط
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}