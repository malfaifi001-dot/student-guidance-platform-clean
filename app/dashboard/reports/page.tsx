import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, FolderOpen, LayoutTemplate, Plus } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { reportVariants } from "@/lib/report-engine/report-variant-registry";
import { buildGuidanceReportWhereForUser } from "@/lib/report-engine/report-access-scope";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";

function getRoleLabel(role: string) {
  if (role === "ADMIN") return "الأدمن";
  if (role === "COUNSELOR") return "الموجه الطلابي";
  if (role === "ACTIVITY_LEADER") return "رائد النشاط";
  if (role === "SCHOOL_OWNER") return "مالك المدرسة";
  if (role === "STAFF") return "الموظف";

  return role || "مستخدم";
}

export default async function ReportsHubPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      redirect("/dashboard/plans?reason=activation-required");
    }

    const overview = await getSchoolSubscriptionOverview(
      current.user.schoolAccountId,
    );

    if (!overview.usable) {
      redirect("/dashboard/plans?reason=activation-required");
    }
  }

  const where = buildGuidanceReportWhereForUser(current.user);

  const [reportsCount, latestReports] = await Promise.all([
    prisma.guidanceReport.count({
      where,
    }),
    prisma.guidanceReport.findMany({
      where,
      include: {
        caseEntry: {
          include: {
            service: true,
            student: true,
          },
        },
      },
      orderBy: [
        {
          generatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 4,
    }),
  ]);

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-700">
              خدمة التقارير
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              مركز التقارير العام
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-500">
              هذه خدمة عامة لكل اللوحات. المستخدم الحالي: {getRoleLabel(current.user.role)}.
              إصدار التقرير يتم من الحالة، ثم يمكن حفظه كنسخة ثابتة وفتحه لاحقًا.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/cases"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              إصدار تقرير من حالة
            </Link>

            <Link
              href="/dashboard/reports/saved"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              <FolderOpen className="h-4 w-4" />
              التقارير المحفوظة
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <FileText className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-black text-slate-500">
            التقارير المحفوظة
          </p>

          <h2 className="mt-1 text-3xl font-black text-slate-950">
            {reportsCount}
          </h2>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <LayoutTemplate className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black text-slate-500">
                أشكال التقارير المتاحة
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                نفس الأشكال لكل المستخدمين حسب الصلاحية
              </h2>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {reportVariants.map((variant) => (
              <span
                key={variant.id}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 ring-1 ring-slate-200"
                title={variant.description}
              >
                {variant.shortName}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-emerald-700">
              آخر الإصدارات
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              أحدث التقارير المحفوظة
            </h2>
          </div>

          <Link
            href="/dashboard/reports/saved"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            عرض الكل
          </Link>
        </div>

        {latestReports.length ? (
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {latestReports.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}/preview`}
                className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
              >
                <p className="text-sm font-black text-slate-950">
                  {report.title || "تقرير محفوظ"}
                </p>

                <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
                  {report.caseEntry?.service?.name || report.serviceSlug}
                  {report.caseEntry?.student?.fullName
                    ? ` · ${report.caseEntry.student.fullName}`
                    : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
            لا توجد تقارير محفوظة حتى الآن.
          </p>
        )}
      </section>
    </main>
  );
}