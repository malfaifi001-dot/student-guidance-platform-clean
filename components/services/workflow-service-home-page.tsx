import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  ImageIcon,
  PencilLine,
  Plus,
  Search,
} from "lucide-react";

import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

type WorkflowServiceHomePageProps = {
  serviceSlug: string;
  title: string;
  description: string;
  newButtonLabel: string;
  caseSingularName: string;
  casePluralName: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function getCaseStatusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "SUBMITTED") return "مرسلة";
  if (status === "ARCHIVED") return "مؤرشفة";

  return status || "غير محدد";
}

function isActivityProgramServiceSlug(serviceSlug: string) {
  return serviceSlug.startsWith("activity-programs-");
}

function getCaseStatusClass(status: string) {
  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }

  if (status === "SUBMITTED") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function isGenericTitle(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

  return (
    !normalized ||
    normalized === "بدون عنوان" ||
    normalized === "حاله بدون عنوان" ||
    normalized === "حالة بدون عنوان" ||
    normalized === "حاله جديده" ||
    normalized === "حالة جديدة" ||
    normalized.includes("برنامج ارشادي جديد")
  );
}

function getCaseTitle(
  caseItem: {
    title?: string | null;
    createdAt?: Date | string | null;
  },
  caseSingularName: string,
) {
  const title = String(caseItem.title || "").trim();

  if (title && !isGenericTitle(title)) {
    return title;
  }

  return `${caseSingularName} - ${formatDate(caseItem.createdAt)}`;
}

function getAssignedTeacherName(caseItem: {
  values?: {
    fieldKey: string;
    value: string | null;
  }[];
}) {
  return (
    caseItem.values?.find((item) => item.fieldKey === "assigned_teacher_name")
      ?.value || ""
  ).trim();
}

function getNextActionText(caseItem: {
  status: string;
  _count: {
    guidanceReports: number;
  };
}) {
  if (caseItem.status === "DRAFT") {
    return "استكمال المسودة";
  }

  if (caseItem._count.guidanceReports > 0) {
    return "فتح التقارير";
  }

  if (caseItem.status === "SUBMITTED") {
    return "إصدار تقرير";
  }

  return "عرض الحالة";
}

export async function WorkflowServiceHomePage({
  serviceSlug,
  title,
  description,
  newButtonLabel,
  caseSingularName,
  casePluralName,
  emptyTitle = "لا توجد حالات بعد",
  emptyDescription = "ابدأ بإنشاء أول حالة. بعد الحفظ ستظهر هنا كبطاقات سهلة.",
}: WorkflowServiceHomePageProps) {
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const service = await prisma.service.findUnique({
    where: {
      slug: serviceSlug,
    },
    include: {
      workflows: {
        where: {
          isActive: true,
        },
        orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!service) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm font-black text-amber-700">{title}</p>

          <h1 className="mt-2 text-3xl font-black text-amber-950">
            الخدمة غير مهيأة
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-amber-800">
            لم يتم العثور على الخدمة. افتح مركز Workflows وارفع ملف الخدمة.
          </p>

          {context.isAdmin ? (
            <Link
              href={`/dashboard/admin/workflows/${serviceSlug}`}
              className="mt-6 inline-flex rounded-2xl bg-amber-900 px-5 py-3 text-sm font-black text-white"
            >
              فتح مركز الرفع
            </Link>
          ) : null}
        </section>
      </main>
    );
  }

  const activeWorkflow = service.workflows[0] || null;

  const cases = await prisma.caseEntry.findMany({
    where: context.isAdmin
      ? {
          serviceId: service.id,
        }
      : {
          serviceId: service.id,
          schoolAccountId: context.schoolAccountId as string,
        },
    orderBy: {
      updatedAt: "desc",
    },
    take: 18,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      submittedAt: true,
      _count: {
        select: {
          values: true,
          evidences: true,
          guidanceReports: true,
        },
      },
      values: {
        where: {
          fieldKey: "assigned_teacher_name",
        },
        take: 1,
        select: {
          fieldKey: true,
          value: true,
        },
      },
      guidanceReports: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          templateId: true,
          updatedAt: true,
        },
      },
    },
  });

  const draftsCount = cases.filter((item) => item.status === "DRAFT").length;
  const submittedCount = cases.filter((item) => item.status === "SUBMITTED").length;
  const readyForReportCount = cases.filter(
    (item) => item.status === "SUBMITTED" && item._count.guidanceReports === 0,
  ).length;

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">Workflow Runtime</p>

            <h1 className="mt-3 text-4xl font-black">{title}</h1>

            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              {description}
            </p>
          </div>

          <Link
            href={`/dashboard/${serviceSlug}/new`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            <Plus className="h-4 w-4" />
            {newButtonLabel}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SimpleMetricCard
          icon={<ClipboardList className="h-5 w-5" />}
          label={casePluralName}
          value={formatCount(cases.length)}
        />

        <SimpleMetricCard
          icon={<PencilLine className="h-5 w-5" />}
          label="مسودات"
          value={formatCount(draftsCount)}
        />

        <SimpleMetricCard
          icon={<FileText className="h-5 w-5" />}
          label="مرسلة"
          value={formatCount(submittedCount)}
        />

        <SimpleMetricCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="جاهزة للتقرير"
          value={formatCount(readyForReportCount)}
        />
      </section>

      {!activeWorkflow ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-black text-amber-950">
            لا يوجد نموذج منشور
          </h2>

          <p className="mt-2 text-sm font-bold leading-7 text-amber-800">
            ارفع Workflow من لوحة الأدمن ثم انشره حتى تظهر نماذج الإنشاء.
          </p>

          {context.isAdmin ? (
            <Link
              href={`/dashboard/admin/workflows/${serviceSlug}`}
              className="mt-5 inline-flex rounded-2xl bg-amber-900 px-5 py-3 text-sm font-black text-white"
            >
              فتح رفع Workflow
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">السجلات السابقة</p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              آخر {casePluralName}
            </h2>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              اختر السجل المطلوب. التفاصيل تظهر فقط عند الحاجة.
            </p>
          </div>

          <Link
            href={`/dashboard/${serviceSlug}/new`}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {newButtonLabel}
          </Link>
        </div>

        {cases.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {cases.map((caseItem) => {
              const latestReport = caseItem.guidanceReports[0] || null;
              const reportHref = latestReport
                ? `/dashboard/report/${latestReport.id}/preview${
                    latestReport.templateId
                      ? `?template=${encodeURIComponent(latestReport.templateId)}`
                      : ""
                  }`
                : `/dashboard/report/new?caseId=${caseItem.id}`;

              return (
                <article
                  key={caseItem.id}
                  className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-white hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-black",
                          getCaseStatusClass(caseItem.status),
                        ].join(" ")}
                      >
                        {getCaseStatusLabel(caseItem.status)}
                      </span>

                      {caseItem._count.evidences > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {formatCount(caseItem._count.evidences)} شواهد
                        </span>
                      ) : null}

                      {caseItem._count.guidanceReports > 0 ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                          له تقرير
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-xl font-black leading-8 text-slate-950">
                      {getCaseTitle(caseItem, caseSingularName)}
                    </h3>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      آخر تحديث: {formatDate(caseItem.updatedAt)}
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                    الإجراء التالي: {getNextActionText(caseItem)}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <Link
                      href={`/dashboard/cases/${caseItem.id}`}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      عرض
                    </Link>

                    <div className="flex flex-wrap gap-2">
                      {caseItem.status === "DRAFT" ? (
                        <Link
                          href={`/dashboard/cases/${caseItem.id}/edit`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                        >
                          <PencilLine className="h-4 w-4" />
                          استكمال
                        </Link>
                      ) : (
                        <Link
                          href={reportHref}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800"
                        >
                          <FileText className="h-4 w-4" />
                          {caseItem._count.guidanceReports > 0
                            ? "فتح التقارير"
                            : "إصدار تقرير"}
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
              <Search className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-800">
              {emptyTitle}
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-500">
              {emptyDescription}
            </p>

            <Link
              href={`/dashboard/${serviceSlug}/new`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {newButtonLabel}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function SimpleMetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </article>
  );
}
