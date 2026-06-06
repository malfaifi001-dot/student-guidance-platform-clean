import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { buildReportListWhere } from "@/lib/reports/report-access";

export default async function ReportsPage() {
  const context = await requireDashboardPageContext();

  const reports = await prisma.guidanceReport.findMany({
    where: buildReportListWhere({
      schoolAccountId: context.schoolAccountId,
      isAdmin: context.isAdmin,
      userId: context.user.id,
      userRole: context.user.role,
    }),
    orderBy: {
      createdAt: "desc",
    },
    include: {
      caseEntry: {
        include: {
          service: true,
          student: {
            include: {
              guardian: true,
            },
          },
        },
      },
      evidenceItems: true,
    },
  });

  const normalizedReports = reports.map((report) => ({
    id: report.id,
    title: report.title,
    serviceSlug: report.serviceSlug,
    status: report.status,
    genderMode: report.genderMode,
    templateId: report.templateId,
    hasTemplateSnapshot: Boolean(report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
    generatedAt: report.generatedAt?.toISOString() || null,
    generatedPdfUrl: report.generatedPdfUrl,
    approvedAt: report.approvedAt?.toISOString() || null,
    archivedAt: report.archivedAt?.toISOString() || null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    evidenceItemsCount: report.evidenceItems.length,

    caseEntry: {
      id: report.caseEntry.id,
      title: report.caseEntry.title,
      status: report.caseEntry.status,
      createdAt: report.caseEntry.createdAt.toISOString(),

      service: {
        id: report.caseEntry.service.id,
        name: report.caseEntry.service.name,
        slug: report.caseEntry.service.slug,
      },

      student: report.caseEntry.student
        ? {
            id: report.caseEntry.student.id,
            fullName: report.caseEntry.student.fullName,
            nationalId: report.caseEntry.student.nationalId,
            stage: report.caseEntry.student.stage,
            grade: report.caseEntry.student.grade,
            classroom: report.caseEntry.student.classroom,
            guardianName: report.caseEntry.student.guardian?.name || null,
            guardianPhone: report.caseEntry.student.guardian?.phone || null,
          }
        : null,
    },
  }));

  const stats = {
    total: normalizedReports.length,
    approved: normalizedReports.filter((report) => report.status === "APPROVED").length,
    draft: normalizedReports.filter((report) => report.status === "DRAFT").length,
    generated: normalizedReports.filter((report) => report.status === "GENERATED").length,
    archived: normalizedReports.filter((report) => report.status === "ARCHIVED").length,
    withSnapshot: normalizedReports.filter((report) => report.hasReportDataSnapshot).length,
    withoutSnapshot: normalizedReports.filter((report) => !report.hasReportDataSnapshot).length,
  };

  return (
    <main className="space-y-8" dir="rtl">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-10 text-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold text-sky-100">Reports Studio</p>

            <h1 className="mt-4 text-5xl font-black">التقارير الإرشادية</h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-100">
              إدارة التقارير الرسمية الصادرة من الحالات، مع دعم القوالب، الشواهد، الاعتماد، وحفظ نسخة ثابتة من التقرير بعد إصداره.
            </p>
          </div>

          <Link
            href="/dashboard/reports/new"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 shadow-sm transition hover:bg-sky-50"
          >
            إنشاء تقرير من حالة
          </Link>
        </div>
      </section>

      <ReportsDashboard reports={normalizedReports} stats={stats} />
    </main>
  );
}
