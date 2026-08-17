import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  Inbox,
  Plus,
  Send,
  UserRound,
} from "lucide-react";

import { SendPerformanceAssignmentCard } from "@/components/principal/send-performance-assignment-card";
import { PrincipalLinkedReportsPanel } from "@/components/principal/principal-linked-reports-panel";
import { getArabicUserRoleLabel } from "@/lib/auth/user-role-display";
import { getPrincipalPerformanceItem } from "@/lib/principal/performance-items";
import { getPrincipalPerformancePageData } from "@/lib/principal/performance-service";

type PageProps = { params: Promise<{ itemSlug: string }> };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الفتح",
  OPENED: "تم الفتح",
  SUBMITTED: "تم استلام التقرير",
  COMPLETED: "مكتمل",
  CANCELED: "ملغي",
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "غير محدد";
  return value.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

export const dynamic = "force-dynamic";

export default async function PrincipalPerformanceItemPage({ params }: PageProps) {
  const { itemSlug } = await params;
  const item = getPrincipalPerformanceItem(itemSlug);
  if (!item) notFound();

  const data = await getPrincipalPerformancePageData(item);
  const returnedAssignments = data.assignments.filter(
    (assignment) =>
      ["SUBMITTED", "COMPLETED"].includes(assignment.status) &&
      (assignment.guidanceReportId || assignment.reportSnapshotId),
  );

  return (
    <main dir="rtl" className="space-y-7">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-900 via-teal-700 to-cyan-600 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <p className="text-xs font-black text-teal-100">عناصر التقييم</p>
            <h1 className="mt-3 max-w-4xl text-2xl font-black leading-[1.7] sm:text-3xl">{item.title}</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-teal-50/90">أنشئ سجلات العنصر وتابع التكليفات والتقارير الواردة إليه في مساحة واحدة.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
            <Link href={`${item.href}/new`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-teal-800 transition hover:bg-teal-50"><Plus className="h-4 w-4" /> إنشاء</Link>
            <SendPerformanceAssignmentCard
              itemSlug={item.slug}
              itemTitle={item.title}
              members={data.members.map((member) => ({
                id: member.id,
                name: member.officialName || member.name,
                role: member.role,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon={<ClipboardCheck className="h-5 w-5" />} label="السجلات" value={data.entries.length} />
        <Metric icon={<Send className="h-5 w-5" />} label="التكليفات المرسلة" value={data.assignments.length} />
        <Metric icon={<Inbox className="h-5 w-5" />} label="التقارير المستلمة" value={returnedAssignments.length} />
      </section>

      <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black text-teal-700">سجلات المدير</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">السجلات السابقة</h2></div>
          <Link href={`${item.href}/new`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white dark:bg-white dark:text-slate-950"><Plus className="h-4 w-4" /> إنشاء</Link>
        </div>
        {data.entries.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {data.entries.map((entry) => (
              <article key={entry.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700 dark:bg-teal-950 dark:text-teal-300">{entry.workflowId ? "Workflow منشور" : "عنوان وقيمة"}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700">{entry.status === "DRAFT" ? "مسودة" : "محفوظ"}</span>
                </div>
                <h3 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-slate-950 dark:text-white">{entry.title || item.shortTitle}</h3>
                <p className="mt-2 text-xs font-bold text-slate-500">{entry._count.values} حقول • آخر تحديث {formatDate(entry.updatedAt)}</p>
                <Link href={`/dashboard/cases/${entry.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-teal-700 dark:text-teal-400">فتح السجل <ArrowLeft className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
        ) : <Empty icon={<ClipboardCheck className="h-8 w-8" />} title="لا توجد سجلات بعد" text="ابدأ بإنشاء أول سجل لهذا العنصر." />}
      </section>

      <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <div><p className="text-xs font-black text-sky-700">المتابعة الداخلية</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">التكليفات المرسلة</h2></div>
        {data.assignments.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {data.assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-[1.5rem] border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="flex items-center gap-2 font-black text-slate-950 dark:text-white"><UserRound className="h-4 w-4 text-sky-600" />{assignment.assignee.officialName || assignment.assignee.name}</p><p className="mt-1 text-xs font-bold text-slate-500">{getArabicUserRoleLabel({ role: assignment.assignee.role, gender: assignment.assignee.gender })}</p></div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">{STATUS_LABELS[assignment.status] || assignment.status}</span>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{assignment.title || "تكليف مرتبط بعنصر التقييم"}</p>
                <p className="mt-2 text-xs font-bold text-slate-400">أرسل في {formatDate(assignment.createdAt)}{assignment.dueDate ? ` • التسليم ${formatDate(assignment.dueDate)}` : ""}</p>
              </article>
            ))}
          </div>
        ) : <Empty icon={<Send className="h-8 w-8" />} title="لا توجد تكليفات مرسلة" text="أرسل تكليفًا إلى أحد منسوبي المدرسة من الزر أعلى الصفحة." />}
      </section>

      <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <div><p className="text-xs font-black text-emerald-700">مرتبطة بهذا العنصر</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">التقارير المستلمة</h2></div>
        {returnedAssignments.length ? (
          <div className="mt-5 space-y-3">
            {returnedAssignments.map((assignment) => {
              const reportTitle = assignment.guidanceReport?.title || assignment.reportSnapshot?.reportTitle || assignment.reportTitleSnapshot || "تقرير مستلم";
              const reportHref = assignment.guidanceReportId
                ? `/dashboard/reports/${assignment.guidanceReportId}/preview`
                : `/dashboard/report-2/snapshots/${assignment.reportSnapshotId}/preview`;
              return (
                <article key={assignment.id} className="grid gap-4 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/50 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center dark:border-emerald-950 dark:bg-emerald-950/20">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 dark:bg-slate-950">{STATUS_LABELS[assignment.status]}</span><span className="text-xs font-black text-slate-500">{assignment.sourceService?.name || assignment.sourceServiceNameSnapshot || "خدمة المصدر"}</span></div>
                    <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">{reportTitle}</h3>
                    <p className="mt-2 text-xs font-bold text-slate-500">من: {assignment.assignee.officialName || assignment.assignee.name} • {getArabicUserRoleLabel({ role: assignment.assignee.role, gender: assignment.assignee.gender })} • أرسل {formatDate(assignment.createdAt)} • استلم {formatDate(assignment.submittedAt)}</p>
                  </div>
                  <Link href={reportHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white"><FileText className="h-4 w-4" /> فتح التقرير</Link>
                </article>
              );
            })}
          </div>
        ) : <Empty icon={<Inbox className="h-8 w-8" />} title="لا توجد تقارير مستلمة" text="عندما يرسل المنسوب تقريره سيظهر هنا داخل عنصر التقييم نفسه." />}
      </section>
      <PrincipalLinkedReportsPanel reports={data.linkedReports} />
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">{icon}</div><div><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{new Intl.NumberFormat("ar-SA").format(value)}</p></div></div></article>;
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-400 dark:bg-slate-950">{icon}</div><h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{title}</h3><p className="mt-2 text-sm font-bold text-slate-500">{text}</p></div>;
}
