import Link from "next/link";
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
import type { PrincipalEvaluationAccreditationService } from "@/lib/principal/evaluation-accreditation-services";
import type { getPrincipalServicePageData } from "@/lib/principal/performance-service";

type PageData = Awaited<ReturnType<typeof getPrincipalServicePageData>>;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الفتح",
  OPENED: "تم الفتح",
  SUBMITTED: "تم استلام التقرير",
  COMPLETED: "مكتمل",
  CANCELED: "ملغي",
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "غير محدد";
  return value.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EvaluationAccreditationServicePage({
  service,
  data,
  hasPublishedWorkflow,
}: {
  service: PrincipalEvaluationAccreditationService;
  data: PageData;
  hasPublishedWorkflow: boolean;
}) {
  const returnedAssignments = data.assignments.filter(
    (assignment) =>
      ["SUBMITTED", "COMPLETED"].includes(assignment.status) &&
      (assignment.guidanceReportId || assignment.reportSnapshotId),
  );
  const assignmentEndpoint =
    `/api/dashboard/principal/evaluation-accreditation/${encodeURIComponent(service.slug)}/assignments`;

  return (
    <main dir="rtl" className="space-y-7">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-indigo-800 to-sky-600 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <p className="text-xs font-black text-indigo-100">التقويم والاعتماد</p>
            <h1 className="mt-3 text-3xl font-black">{service.title}</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-indigo-50/90">
              {service.description}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
            <Link href={`${service.href}/new`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-indigo-900 transition hover:bg-indigo-50">
              <Plus className="h-4 w-4" /> إنشاء
            </Link>
            <SendPerformanceAssignmentCard
              itemSlug={service.slug}
              itemTitle={service.title}
              endpoint={assignmentEndpoint}
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

      {!hasPublishedWorkflow ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="text-xl font-black text-amber-950 dark:text-amber-100">لا يوجد Workflow منشور</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-amber-800 dark:text-amber-200">ارفع Workflow من لوحة الأدمن ثم انشره حتى يظهر نموذج الإنشاء لمدير المدرسة.</p>
        </section>
      ) : null}

      <Panel eyebrow="سجلات الخدمة" title="السجلات السابقة">
        {data.entries.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.entries.map((entry) => (
              <article key={entry.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Workflow منشور</span>
                  <span className="rounded-full bg-white px-3 py-1 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700">{entry.status === "DRAFT" ? "مسودة" : "محفوظ"}</span>
                </div>
                <h3 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-slate-950 dark:text-white">{entry.title || service.shortTitle}</h3>
                <p className="mt-2 text-xs font-bold text-slate-500">{entry._count.values} حقول • آخر تحديث {formatDate(entry.updatedAt)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <Link href={`/dashboard/cases/${entry.id}`} className="inline-flex items-center gap-2 text-sm font-black text-indigo-700 dark:text-indigo-400">فتح السجل <ArrowLeft className="h-4 w-4" /></Link>
                  {entry.status === "SUBMITTED" ? (
                    <Link href={`/dashboard/report/new?caseId=${entry.id}`} className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-400"><FileText className="h-4 w-4" /> {entry._count.guidanceReports ? "فتح التقارير" : "إصدار تقرير"}</Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : <Empty title="لا توجد سجلات بعد" text="ابدأ بإنشاء أول سجل من Workflow المنشور لهذه الخدمة." />}
      </Panel>

      <Panel eyebrow="المتابعة الداخلية" title="التكليفات المرسلة">
        {data.assignments.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-[1.5rem] border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-black text-slate-950 dark:text-white"><UserRound className="h-4 w-4 text-sky-600" />{assignment.assignee.officialName || assignment.assignee.name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{getArabicUserRoleLabel({ role: assignment.assignee.role, gender: assignment.assignee.gender })}</p>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">{STATUS_LABELS[assignment.status] || assignment.status}</span>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{assignment.title || `تكليف مرتبط بخدمة ${service.title}`}</p>
                <p className="mt-2 text-xs font-bold text-slate-400">أرسل في {formatDate(assignment.createdAt)}{assignment.dueDate ? ` • التسليم ${formatDate(assignment.dueDate)}` : ""}</p>
              </article>
            ))}
          </div>
        ) : <Empty title="لا توجد تكليفات مرسلة" text="أرسل تكليفًا إلى أحد منسوبي المدرسة من الزر أعلى الصفحة." />}
      </Panel>

      <Panel eyebrow="مرتبطة بهذه الخدمة" title="التقارير المستلمة">
        {returnedAssignments.length ? (
          <div className="space-y-3">
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
                    <p className="mt-2 text-xs font-bold text-slate-500">من: {assignment.assignee.officialName || assignment.assignee.name} • {getArabicUserRoleLabel({ role: assignment.assignee.role, gender: assignment.assignee.gender })} • كُلّف {formatDate(assignment.createdAt)} • استلم {formatDate(assignment.submittedAt)}</p>
                  </div>
                  <Link href={reportHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white"><FileText className="h-4 w-4" /> فتح التقرير</Link>
                </article>
              );
            })}
          </div>
        ) : <Empty title="لا توجد تقارير مستلمة" text="عندما يرسل المنسوب تقريره سيظهر داخل الخدمة التي صدر منها التكليف." />}
      </Panel>
      <PrincipalLinkedReportsPanel reports={data.linkedReports} />
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{icon}</div><div><p className="text-xs font-black text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{new Intl.NumberFormat("ar-SA").format(value)}</p></div></div></article>;
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-indigo-700 dark:text-indigo-300">{eyebrow}</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{title}</h2></div></div>{children}</section>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900"><h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3><p className="mt-2 text-sm font-bold text-slate-500">{text}</p></div>;
}
