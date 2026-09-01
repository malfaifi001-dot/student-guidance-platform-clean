import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  FileText,
  ImageIcon,
  PencilLine,
  Plus,
  Search,
} from "lucide-react";

import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { GuidanceScope } from "@/components/guidance/guidance-scope";
import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";

type WorkflowServiceHomePageProps = {
  serviceSlug: string;
  title: string;
  description: string;
  newButtonLabel: string;
  caseSingularName: string;
  casePluralName: string;
  basePath?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  heroSecondaryAction?: ReactNode;
  allowPrincipal?: boolean;
  ownerScoped?: boolean;
  reportPrepareBasePath?: string;
  hideWorkflowStatus?: boolean;
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
  newButtonLabel,
  caseSingularName,
  casePluralName,
  basePath = `/dashboard/${serviceSlug}`,
  emptyTitle = "لا توجد حالات بعد",
  emptyDescription = "ابدأ بإنشاء أول حالة. بعد الحفظ ستظهر هنا كبطاقات سهلة.",
  heroSecondaryAction,
  allowPrincipal = false,
  ownerScoped = false,
  reportPrepareBasePath,
  hideWorkflowStatus = false,
}: WorkflowServiceHomePageProps) {
  const context = await requireDashboardPageContext({ allowPrincipal });

  if (!context.isAdmin && !context.schoolAccountId && !ownerScoped) {
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
          status: "ACTIVE",
          workflowType: {
            in: ["service-main", "default"],
          },
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
          ...(ownerScoped
            ? { createdById: context.user.id }
            : { schoolAccountId: context.schoolAccountId as string }),
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
  const isActivityService = isActivityProgramServiceSlug(serviceSlug);

  return (
    <main className="space-y-5 sm:space-y-6" dir="rtl">
      <GuidanceScope
        context="service-overview"
        capabilities={heroSecondaryAction ? ["send-to-teacher"] : []}
      />
      <section className={["relative overflow-hidden rounded-3xl p-5 text-white shadow-md sm:p-6", isActivityService ? "bg-gradient-to-l from-cyan-900 via-sky-800 to-sky-700" : "bg-gradient-to-l from-sky-900 via-sky-800 to-indigo-700"].join(" ")}>
        <span className="pointer-events-none absolute inset-y-0 start-0 w-1 bg-white/35" aria-hidden="true" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/20">
                <ClipboardList className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <Link
              href={`${basePath}/new`}
              data-guidance="service-create"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-sky-900 transition hover:bg-sky-50"
            >
              <Plus className="h-4 w-4" />
              {newButtonLabel}
            </Link>

            {heroSecondaryAction ? (
              <div className="[&>button]:min-h-10 [&>button]:rounded-xl [&>button]:px-4 [&>button]:py-2.5" data-guidance="service-secondary-action">
                {heroSecondaryAction}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <span>{casePluralName}: <b className="text-slate-950 dark:text-white">{formatCount(cases.length)}</b></span>
        <span>{"مسودات"}: <b className="text-slate-950 dark:text-white">{formatCount(draftsCount)}</b></span>
        <span>{"مرسلة"}: <b className="text-slate-950 dark:text-white">{formatCount(submittedCount)}</b></span>
        <span>{"جاهزة للتقرير"}: <b className="text-slate-950 dark:text-white">{formatCount(readyForReportCount)}</b></span>
      </section>

      {!activeWorkflow && !hideWorkflowStatus ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
          <h2 className="text-lg font-black text-amber-950 dark:text-amber-100">
            لا يوجد نموذج منشور
          </h2>

          <p className="mt-1 text-xs font-bold leading-6 text-amber-800 dark:text-amber-200">
            ارفع Workflow من لوحة الأدمن ثم انشره حتى تظهر نماذج الإنشاء.
          </p>

          {context.isAdmin ? (
            <Link
              href={`/dashboard/admin/workflows/${serviceSlug}`}
              className="mt-3 inline-flex rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-black text-white"
            >
              فتح رفع Workflow
            </Link>
          ) : null}
        </section>
      ) : null}

      <section data-guidance="service-records" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              آخر {casePluralName}
            </h2>
          </div>
        </div>

        {cases.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {cases.map((caseItem) => {
              const latestReport = caseItem.guidanceReports[0] || null;
              const reportHref = latestReport
                ? `/dashboard/report/${latestReport.id}/preview${
                    latestReport.templateId
                      ? `?template=${encodeURIComponent(latestReport.templateId)}`
                      : ""
                  }`
                : reportPrepareBasePath
                  ? `${reportPrepareBasePath}/${encodeURIComponent(caseItem.id)}/prepare`
                  : `/dashboard/report/new?caseId=${caseItem.id}`;

              return (
                <article
                  key={caseItem.id}
                  className="flex flex-col gap-3 border-slate-200 py-3 first:pt-0 last:pb-0 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-950/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-black",
                          getCaseStatusClass(caseItem.status),
                        ].join(" ")}
                      >
                        {getCaseStatusLabel(caseItem.status)}
                      </span>

                      {caseItem._count.evidences > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-900/50">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {formatCount(caseItem._count.evidences)} شواهد
                        </span>
                      ) : null}

                      {caseItem._count.guidanceReports > 0 ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/50">
                          له تقرير
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-1 text-base font-black leading-6 text-slate-950 dark:text-white">
                      {getCaseTitle(caseItem, caseSingularName)}
                    </h3>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      آخر تحديث: {formatDate(caseItem.updatedAt)}
                    </p>
                  </div>

                  <div className="text-xs font-black text-slate-500 dark:text-slate-400 sm:min-w-[190px]">
                    الإجراء التالي: <span className="text-slate-700 dark:text-slate-200">{getNextActionText(caseItem)}</span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                    <div className="flex flex-wrap gap-1.5">
                      {caseItem.status === "DRAFT" ? (
                        <Link
                          href={`/dashboard/cases/${caseItem.id}/edit`}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800"
                        >
                          <PencilLine className="h-4 w-4" />
                          استكمال
                        </Link>
                      ) : (
                        <Link
                          href={reportHref}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
                        >
                          <FileText className="h-4 w-4" />
                          {caseItem._count.guidanceReports > 0
                            ? "فتح التقارير"
                            : "إصدار تقرير"}
                        </Link>
                      )}
                    </div>
                    <ExpandableActionMenu
                      menuId={`service-case:${caseItem.id}`}
                      overlayStrip
                      className="self-center"
                      stripClassName="rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    >
                      <Link
                        href={`/dashboard/cases/${caseItem.id}`}
                        className="block min-w-[110px] rounded-lg px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        عرض الحالة
                      </Link>
                    </ExpandableActionMenu>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
              <Search className="h-5 w-5" />
            </div>

            <h3 className="mt-3 text-lg font-black text-slate-800 dark:text-slate-100">
              {emptyTitle}
            </h3>

            <p className="mx-auto mt-1 max-w-xl text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
              {emptyDescription}
            </p>

          </div>
        )}
      </section>
    </main>
  );
}
