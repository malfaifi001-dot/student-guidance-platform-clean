"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  UserRound,
  X,
} from "lucide-react";

type Props = {
  domainSlug: string;
  domainTitle: string;
};

type AssignmentSummary = {
  id: string;
  teacherName: string;
  teacherPhone: string;
  domainTitle: string;
  status: string;
  dueDate: string | null;
  openedAt: string | null;
  submittedAt: string | null;
  publicUrl: string;
  whatsappUrl: string;
};

const STATUS_LABELS: Record<string, string> = {
  SENT: "تم الإرسال",
  OPENED: "فتح الرابط",
  SUBMITTED: "بانتظار الاعتماد",
  APPROVED: "معتمد",
  RETURNED: "مرجع للتعديل",
  EXPIRED: "منتهي",
  CANCELED: "ملغي",
};

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SendActivityAssignmentCard({ domainSlug, domainTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentSummary | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function loadAssignments() {
    setAssignmentsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/activity-leader/teacher-assignments?domainSlug=${encodeURIComponent(domainSlug)}`,
        { cache: "no-store" },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر تحميل الأنشطة المرسلة.");
      }

      setAssignments(result.assignments || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل الأنشطة المرسلة.",
      );
    } finally {
      setAssignmentsLoading(false);
    }
  }

  async function openExistingAssignments() {
    setTab("existing");
    await loadAssignments();
  }

  async function copyLink(value: string, id: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAssignment(null);

    try {
      const response = await fetch("/api/dashboard/activity-leader/teacher-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setTeacherName("");
      setTeacherPhone("");
      setTeacherEmail("");
      setDueDate("");
      setNote("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إنشاء رابط المعلم.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTab("new");
          setError("");
        }}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-6 py-3 text-sm font-black text-white transition hover:bg-white/25"
      >
        <Send className="h-4 w-4" />
        إرسال نشاط لمعلم
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-assignment-dialog-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/20"
            dir="rtl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                  {domainTitle}
                </span>
                <h2
                  id="activity-assignment-dialog-title"
                  className="mt-3 text-2xl font-black text-slate-950"
                >
                  إرسال نشاط لمعلم
                </h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  أنشئ رابطًا آمنًا للنموذج المنشور لهذا المجال وأرسله عبر واتساب.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="border-b border-slate-100 px-5 pt-4 sm:px-6">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <TabButton active={tab === "new"} onClick={() => setTab("new")}>
                  إرسال جديد
                </TabButton>
                <TabButton active={tab === "existing"} onClick={openExistingAssignments}>
                  متابعة الأنشطة المرسلة
                </TabButton>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              {tab === "new" ? (
                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                  <Field label="اسم المعلم">
                    <input
                      value={teacherName}
                      onChange={(event) => setTeacherName(event.target.value)}
                      required
                      className="input"
                      placeholder="مثال: محمد علي"
                    />
                  </Field>
                  <Field label="رقم جوال المعلم">
                    <input
                      value={teacherPhone}
                      onChange={(event) => setTeacherPhone(event.target.value)}
                      required
                      inputMode="tel"
                      className="input"
                      placeholder="05xxxxxxxx"
                    />
                  </Field>
                  <Field label="البريد الإلكتروني (اختياري)">
                    <input
                      value={teacherEmail}
                      onChange={(event) => setTeacherEmail(event.target.value)}
                      type="email"
                      className="input"
                      placeholder="teacher@example.com"
                    />
                  </Field>
                  <Field label="تاريخ التسليم (اختياري)">
                    <input
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      type="date"
                      className="input"
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="ملاحظة للمعلم (اختياري)">
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        className="input min-h-24 resize-none"
                        placeholder="مثال: فضلاً رفع صورتين واضحتين من تنفيذ النشاط."
                      />
                    </Field>
                  </div>

                  {error ? <ErrorMessage message={error} /> : null}

                  <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      إنشاء رابط المعلم
                    </button>
                    <button
                      type="button"
                      onClick={openExistingAssignments}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      متابعة المرسل سابقًا
                    </button>
                  </div>

                  {assignment ? (
                    <div className="md:col-span-2 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-sm font-black text-emerald-800">
                        تم إنشاء الرابط بنجاح للأستاذ/ة {assignment.teacherName}
                      </p>
                      <div className="mt-3 break-all rounded-2xl bg-white px-4 py-3 text-left text-xs font-bold text-slate-600" dir="ltr">
                        {assignment.publicUrl}
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <a href={assignment.whatsappUrl} target="_blank" rel="noreferrer" className="action-primary">
                          <MessageCircle className="h-4 w-4" />
                          إرسال عبر واتساب
                        </a>
                        <button type="button" onClick={() => copyLink(assignment.publicUrl, assignment.id)} className="action-secondary">
                          <Copy className="h-4 w-4" />
                          {copied === assignment.id ? "تم النسخ" : "نسخ الرابط"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </form>
              ) : (
                <div className="space-y-4">
                  {assignmentsLoading ? (
                    <div className="grid min-h-40 place-items-center text-sky-700">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                  ) : null}
                  {!assignmentsLoading && error ? <ErrorMessage message={error} /> : null}
                  {!assignmentsLoading && !error && assignments.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="font-black text-slate-800">لا توجد أنشطة مرسلة في هذا المجال بعد</p>
                    </div>
                  ) : null}
                  {!assignmentsLoading && !error ? assignments.map((item) => (
                    <article key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                              {STATUS_LABELS[item.status] || item.status}
                            </span>
                            {item.openedAt ? <span className="text-xs font-black text-emerald-700">تم فتح الرابط</span> : null}
                            {item.submittedAt ? <span className="text-xs font-black text-violet-700">تم التسليم</span> : null}
                          </div>
                          <p className="mt-3 flex items-center gap-2 font-black text-slate-950">
                            <UserRound className="h-4 w-4 text-sky-600" />
                            {item.teacherName}
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                            <CalendarDays className="h-4 w-4" />
                            موعد التسليم: {formatDate(item.dueDate)}
                          </p>
                        </div>
                        <span className="text-xs font-black text-slate-400">{item.domainTitle}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <a href={item.publicUrl} target="_blank" rel="noreferrer" className="action-secondary">
                          <ExternalLink className="h-4 w-4" /> فتح الرابط
                        </a>
                        <a href={item.whatsappUrl} target="_blank" rel="noreferrer" className="action-primary">
                          <MessageCircle className="h-4 w-4" /> واتساب
                        </a>
                        <button type="button" onClick={() => copyLink(item.publicUrl, item.id)} className="action-secondary">
                          <Copy className="h-4 w-4" /> {copied === item.id ? "تم النسخ" : "نسخ"}
                        </button>
                      </div>
                    </article>
                  )) : null}

                  <Link href="/dashboard/activity-leader/teacher-assignments" className="inline-flex items-center gap-2 text-sm font-black text-sky-700 hover:text-sky-900">
                    عرض جميع الأنشطة المرسلة
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <style jsx>{`
        .input { width: 100%; border-radius: 1rem; border: 1px solid rgb(226 232 240); background: white; padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 700; outline: none; transition: 150ms; }
        .input:focus { border-color: rgb(125 211 252); box-shadow: 0 0 0 4px rgb(240 249 255); }
        .action-primary, .action-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 1rem; padding: 0.625rem 1rem; font-size: 0.75rem; font-weight: 900; transition: 150ms; }
        .action-primary { background: rgb(5 150 105); color: white; }
        .action-primary:hover { background: rgb(4 120 87); }
        .action-secondary { border: 1px solid rgb(226 232 240); background: white; color: rgb(51 65 85); }
        .action-secondary:hover { background: rgb(248 250 252); }
      `}</style>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2.5 text-xs font-black transition",
        active ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="md:col-span-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
      {message}
    </div>
  );
}
