import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActivityExecutionCardReport } from "@/components/activity-programs/reports/activity-execution-card-report";
import { ReportPrintButton } from "@/components/activity-programs/reports/report-print-button";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { buildActivityExecutionCardReportData } from "@/lib/activity-programs/activity-card-report-runtime";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

function isActivityProgramService(slug?: string | null) {
  return Boolean(slug?.startsWith("activity-programs-"));
}

export default async function ActivityCardReportFromCasePage({
  params,
}: PageProps) {
  const { caseId } = await params;
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && context.user.role !== "ACTIVITY_LEADER") {
    redirect("/dashboard");
  }

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const caseEntry = await prisma.caseEntry.findFirst({
    where: context.isAdmin
      ? {
          id: caseId,
        }
      : {
          id: caseId,
          schoolAccountId: context.schoolAccountId as string,
        },
    include: {
      service: true,
      createdBy: true,
      schoolAccount: {
        include: {
          profile: true,
        },
      },
      workflow: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
                orderBy: {
                  order: "asc",
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      values: {
        include: {
          field: {
            include: {
              options: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      evidences: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!caseEntry || !isActivityProgramService(caseEntry.service?.slug)) {
    notFound();
  }

  const reportData = buildActivityExecutionCardReportData(caseEntry);

  return (
    <main className="space-y-6" dir="rtl">
      <section className="no-print rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-700">
              تقرير رائد النشاط
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              بطاقة تنفيذ برنامج نشاط طلابي
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-500">
              هذا التقرير يسحب بياناته مباشرة من Workflow الحالة والشواهد
              والتوقيع، ثم يحول القيم إلى نصوص مفهومة داخل التقرير.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/cases/${caseEntry.id}`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              العودة للحالة
            </Link>

            <ReportPrintButton />
          </div>
        </div>
      </section>

      <ActivityExecutionCardReport data={reportData} />
    </main>
  );
}