"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Inbox, Loader2, MoreVertical, X } from "lucide-react";
import { useEffect, useState } from "react";

type Assignment = {
  id: string; title: string | null; note: string | null; status: string;
  dueDate: string | null; createdAt: string; creatorName: string;
  originServiceName: string; returnedReportTitle: string | null;
};
type AccountabilityRequest = {
  title: string; status: string; token: string; sentAt: string;
  returnedReason: string | null; creatorName: string;
};
type ReportOption = { sourceType: "GUIDANCE_REPORT" | "REPORT_SNAPSHOT"; sourceId: string; serviceSlug: string; serviceName: string; title: string; issuedAt: string };

const statusLabels: Record<string, string> = {
  PENDING: "جديد", OPENED: "مفتوح", SUBMITTED: "تم التسليم",
  COMPLETED: "مكتمل", CANCELED: "ملغي",
};
const pendingStatuses = new Set(["SENT", "OPENED", "NEEDS_COMPLETION"]);
const dateText = (value: string | null) => value ? new Date(value).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "غير محدد";

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"><Inbox className="mx-auto mb-2 h-6 w-6 text-slate-300" />{text}</div>;
}

export function InternalAssignmentsClient({
  eyebrow,
  assignments,
  accountabilityRequests,
}: {
  eyebrow: string;
  assignments: Assignment[];
  accountabilityRequests: AccountabilityRequest[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"assignments" | "accountability" | "saved">("assignments");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [serviceSlug, setServiceSlug] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const filteredReports = (details?.reports || []).filter((report: ReportOption) => report.serviceSlug === serviceSlug);

  useEffect(() => {
    if (!openId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [openId]);

  async function openAssignment(id: string) {
    setOpenId(id); setDetails(null); setServiceSlug(""); setSelectedReport(null); setFeedback(null); setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/internal-assignments/${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "تعذر فتح التكليف.");
      setDetails(result);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "تعذر فتح التكليف.");
    } finally { setLoading(false); }
  }

  async function submitReport() {
    if (!openId || !selectedReport) return;
    setSubmitting(true); setFeedback(null);
    try {
      const response = await fetch(`/api/dashboard/internal-assignments/${encodeURIComponent(openId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceType: selectedReport.sourceType, sourceId: selectedReport.sourceId }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "تعذر إرسال التقرير.");
      setFeedback(result.message || "تم إرسال التقرير بنجاح.");
      setDetails((current: any) => current ? { ...current, assignment: { ...current.assignment, status: "SUBMITTED" } } : current);
      router.refresh();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "تعذر إرسال التقرير."); }
    finally { setSubmitting(false); }
  }

  return (
    <main dir="rtl" className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:px-5">
        <p className="text-xs font-black text-sky-700 dark:text-sky-300">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">تكليفاتي</h1>
        <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">تابع التكليفات والإفادات المطلوبة منك.</p>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950" aria-label="أقسام التكليفات">
        {([["assignments", "التكليفات"], ["accountability", "الإفادات والمتابعات"], ["saved", "محفوظة"]] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-black ${tab === value ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{label}</button>
        ))}
      </nav>

      {tab === "assignments" ? (
        assignments.length ? <section className="space-y-2">{assignments.map((assignment) => (
          <article key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 className="truncate font-black text-slate-950 dark:text-white">{assignment.title || assignment.originServiceName}</h2><p className="mt-1 text-xs font-bold text-slate-500">{assignment.originServiceName} · من {assignment.creatorName}</p></div><button type="button" aria-label="إجراءات إضافية" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreVertical className="h-5 w-5" /></button></div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{statusLabels[assignment.status] || "قيد المتابعة"}</span>{assignment.dueDate ? <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><CalendarDays className="h-3.5 w-3.5" />موعد التسليم {dateText(assignment.dueDate)}</span> : null}</div>
            <button type="button" onClick={() => openAssignment(assignment.id)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black text-white dark:bg-white dark:text-slate-950">فتح التكليف</button>
          </article>
        ))}</section> : <EmptyState text="لا توجد تكليفات حالية." />
      ) : null}

      {tab === "accountability" ? (
        accountabilityRequests.length ? <section className="space-y-2">{accountabilityRequests.map((request) => (
          <article key={request.token} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 className="font-black text-slate-950 dark:text-white">{request.title}</h2><p className="mt-1 text-xs font-bold text-slate-500">من {request.creatorName} · أُرسلت {dateText(request.sentAt)}</p></div><button type="button" aria-label="إجراءات إضافية" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreVertical className="h-5 w-5" /></button></div><div className="mt-3 flex items-center justify-between gap-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{request.status === "NEEDS_COMPLETION" ? "تحتاج استكمالًا" : request.status === "RESPONDED" ? "وردت الإفادة" : pendingStatuses.has(request.status) ? "مطلوب مني" : "محفوظة"}</span><Link href={`/accountability/respond/${encodeURIComponent(request.token)}`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-700 px-4 text-sm font-black text-white">{pendingStatuses.has(request.status) ? "فتح الإفادة" : "عرض الإفادة"}</Link></div>{request.returnedReason ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-900">{request.returnedReason}</p> : null}</article>
        ))}</section> : <EmptyState text="لا توجد إفادات أو متابعات حالية." />
      ) : null}

      {tab === "saved" ? <EmptyState text="لا توجد عناصر محفوظة." /> : null}

      {openId ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setOpenId(null)}><section role="dialog" aria-modal="true" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-950"><header className="flex items-start justify-between border-b border-slate-100 p-4 dark:border-slate-800"><div><p className="text-xs font-black text-sky-700">تكليف داخلي</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">إرسال تقرير موجود</h2></div><button type="button" onClick={() => setOpenId(null)} className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800" aria-label="إغلاق"><X className="h-5 w-5" /></button></header><div className="space-y-4 p-4">{loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-sky-700" /></div> : details ? <><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><h3 className="font-black text-slate-950 dark:text-white">{details.assignment.title || details.assignment.originService.name}</h3><p className="mt-2 text-sm font-bold text-slate-500">{details.assignment.note || "يمكنك مراجعة التكليف وإرسال التقرير المناسب."}</p></div>{["SUBMITTED", "COMPLETED"].includes(details.assignment.status) ? <div className="rounded-xl bg-emerald-50 p-4 text-center font-black text-emerald-800"><CheckCircle2 className="mx-auto mb-2 h-7 w-7" />تم تسليم تقرير هذا التكليف.</div> : <><label className="block"><span className="mb-1.5 block text-sm font-black">اختر خدمة من خدماتك</span><select value={serviceSlug} onChange={(event) => { setServiceSlug(event.target.value); setSelectedReport(null); }} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"><option value="">اختر الخدمة</option>{details.services.map((service: { id: string; slug: string; name: string }) => <option key={service.id} value={service.slug}>{service.name}</option>)}</select></label>{serviceSlug ? filteredReports.length ? <div className="space-y-2">{filteredReports.map((report: ReportOption) => <label key={`${report.sourceType}:${report.sourceId}`} className={`block cursor-pointer rounded-xl border p-3 ${selectedReport?.sourceId === report.sourceId ? "border-sky-500 bg-sky-50" : "border-slate-200 dark:border-slate-700"}`}><div className="flex gap-3"><input type="radio" name="report" checked={selectedReport?.sourceType === report.sourceType && selectedReport.sourceId === report.sourceId} onChange={() => setSelectedReport(report)} /><div><p className="font-black">{report.title}</p><p className="text-xs font-bold text-slate-500">{report.serviceName} · {dateText(report.issuedAt)}</p></div></div></label>)}</div> : <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">لا توجد تقارير سابقة متاحة.</p> : null}<button type="button" disabled={!selectedReport || submitting} onClick={() => void submitReport()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-black text-white disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}إرسال التقرير إلى المدير</button></>}</> : null}{feedback ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{feedback}</p> : null}</div></section></div> : null}
    </main>
  );
}
