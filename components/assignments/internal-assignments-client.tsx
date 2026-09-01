"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, FileText, Inbox, Loader2, Send, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Assignment = {
  id: string;
  title: string | null;
  note: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
  openedAt: string | null;
  submittedAt: string | null;
  creatorName: string;
  originServiceName: string;
  returnedReportTitle: string | null;
};

type ServiceOption = { id: string; slug: string; name: string };
type ReportOption = {
  sourceType: "GUIDANCE_REPORT" | "REPORT_SNAPSHOT";
  sourceId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  title: string;
  issuedAt: string;
  caseEntryId: string;
};
type AssignmentDetails = {
  assignment: Assignment & { originService: { name: string }; createdBy: { name: string; officialName: string | null } };
  services: ServiceOption[];
  reports: ReportOption[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "جديد",
  OPENED: "مفتوح",
  SUBMITTED: "تم التسليم",
  COMPLETED: "مكتمل",
  CANCELED: "ملغي",
};

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Date(value).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function reportHref(report: ReportOption) {
  return report.sourceType === "GUIDANCE_REPORT"
    ? `/dashboard/reports/${report.sourceId}/preview`
    : `/dashboard/report-2/snapshots/${report.sourceId}/preview`;
}

export function InternalAssignmentsClient({
  eyebrow,
  assignments,
}: {
  eyebrow: string;
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<AssignmentDetails | null>(null);
  const [serviceSlug, setServiceSlug] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const filteredReports = useMemo(
    () => details?.reports.filter((report) => report.serviceSlug === serviceSlug) || [],
    [details, serviceSlug],
  );

  useEffect(() => {
    if (!openId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [openId]);

  async function openAssignment(id: string) {
    setOpenId(id);
    setDetails(null);
    setServiceSlug("");
    setSelectedReport(null);
    setFeedback(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/internal-assignments/${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "تعذر فتح التكليف.");
      setDetails(result);
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "تعذر فتح التكليف." });
    } finally {
      setLoading(false);
    }
  }

  async function submitReport() {
    if (!openId || !selectedReport) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/dashboard/internal-assignments/${encodeURIComponent(openId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: selectedReport.sourceType, sourceId: selectedReport.sourceId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "تعذر إرسال التقرير.");
      setFeedback({ tone: "success", text: result.message });
      setDetails((current) => current ? { ...current, assignment: { ...current.assignment, status: "SUBMITTED" } } : current);
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "تعذر إرسال التقرير." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main dir="rtl" className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 p-4 text-white shadow-md sm:p-5">
        <p className="text-xs font-black text-sky-200">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black">تكليفاتي</h1>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-300">استعرض تكليفات إدارة المدرسة، ثم اختر تقريرًا موجودًا من خدماتك وأرسله دون إنشاء تقرير جديد.</p>
      </section>

      {assignments.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {assignments.map((assignment) => (
            <article key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">{STATUS_LABELS[assignment.status] || assignment.status}</span>
                <span className="text-xs font-bold text-slate-400">{formatDate(assignment.createdAt)}</span>
              </div>
              <h2 className="mt-4 text-lg font-black leading-7 text-slate-950 dark:text-white">{assignment.title || assignment.originServiceName}</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">عنصر التقييم: {assignment.originServiceName}</p>
              <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-400"><UserRound className="h-4 w-4" /> من {assignment.creatorName}</p>
              {assignment.dueDate ? <p className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-700"><CalendarDays className="h-4 w-4" /> موعد التسليم {formatDate(assignment.dueDate)}</p> : null}
              {assignment.returnedReportTitle ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">التقرير المرسل: {assignment.returnedReportTitle}</p> : null}
              <button type="button" onClick={() => openAssignment(assignment.id)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white dark:bg-white dark:text-slate-950"><Inbox className="h-4 w-4" /> فتح التكليف</button>
            </article>
          ))}
        </section>
      ) : (
        <section className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-950"><div><Inbox className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 text-lg font-black text-slate-950 dark:text-white">لا توجد تكليفات حاليًا</h2><p className="mt-1 text-sm font-bold text-slate-500">ستظهر هنا التكليفات الداخلية المرسلة لك من مدير المدرسة.</p></div></section>
      )}

      {openId ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setOpenId(null)}>
          <section role="dialog" aria-modal="true" dir="rtl" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl dark:bg-slate-950">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 dark:border-slate-800"><div><p className="text-xs font-black text-sky-700">تكليف داخلي</p><h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">إرسال تقرير موجود</h2></div><button type="button" onClick={() => setOpenId(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="إغلاق"><X className="h-5 w-5" /></button></header>
            <div className="space-y-5 p-5 sm:p-6">
              {loading ? <div className="grid min-h-52 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-sky-700" /></div> : null}
              {details ? (
                <>
                  <div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-slate-900"><h3 className="font-black text-slate-950 dark:text-white">{details.assignment.title || details.assignment.originService.name}</h3><p className="mt-2 text-sm font-bold text-slate-500">عنصر التقييم: {details.assignment.originService.name}</p>{details.assignment.note ? <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">{details.assignment.note}</p> : null}</div>
                  {["SUBMITTED", "COMPLETED"].includes(details.assignment.status) ? (
                    <div className="rounded-[1.5rem] bg-emerald-50 p-5 text-center text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="mx-auto h-9 w-9" /><p className="mt-3 font-black">تم تسليم تقرير هذا التكليف.</p></div>
                  ) : (
                    <>
                      <label className="block"><span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">اختر خدمة من خدماتك</span><select value={serviceSlug} onChange={(event) => { setServiceSlug(event.target.value); setSelectedReport(null); }} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900"><option value="">اختر الخدمة</option>{details.services.map((service) => <option key={service.id} value={service.slug}>{service.name}</option>)}</select></label>
                      {serviceSlug ? filteredReports.length ? <div className="space-y-3"><p className="text-sm font-black text-slate-700 dark:text-slate-200">اختر تقريرًا موجودًا</p>{filteredReports.map((report) => <label key={`${report.sourceType}:${report.sourceId}`} className={selectedReport?.sourceId === report.sourceId ? "block cursor-pointer rounded-[1.25rem] border-2 border-sky-500 bg-sky-50 p-4 dark:bg-sky-950/30" : "block cursor-pointer rounded-[1.25rem] border border-slate-200 p-4 dark:border-slate-700"}><div className="flex items-start gap-3"><input type="radio" name="report" checked={selectedReport?.sourceType === report.sourceType && selectedReport.sourceId === report.sourceId} onChange={() => setSelectedReport(report)} className="mt-1" /><div className="min-w-0 flex-1"><p className="font-black text-slate-950 dark:text-white">{report.title}</p><p className="mt-1 text-xs font-bold text-slate-500">{report.serviceName} • {formatDate(report.issuedAt)}</p><Link href={reportHref(report)} target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-sky-700"><FileText className="h-4 w-4" /> معاينة التقرير</Link></div></div></label>)}</div> : <p className="rounded-2xl bg-amber-50 p-4 text-sm font-black text-amber-800">لا توجد تقارير سابقة متاحة في هذه الخدمة.</p> : null}
                      {!details.services.length ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-black text-amber-800">لا توجد تقارير صادرة متاحة ضمن خدمات دورك واشتراك المدرسة.</p> : null}
                    </>
                  )}
                </>
              ) : null}
              {feedback ? <div className={feedback.tone === "success" ? "rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700" : "rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700"}>{feedback.text}</div> : null}
              {details && !["SUBMITTED", "COMPLETED"].includes(details.assignment.status) ? <button type="button" disabled={!selectedReport || submitting} onClick={submitReport} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-6 text-sm font-black text-white disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} إرسال التقرير إلى المدير</button> : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
