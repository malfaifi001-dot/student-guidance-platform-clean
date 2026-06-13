import { notFound, redirect } from "next/navigation";

import { ReportOnePreviewPage } from "@/components/report-1/report-one-preview-page";
import type { ReportOneDocumentDraft } from "@/components/report-1/editor/report-one-editor-types";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";
import { buildGuidanceReportWhereForUser } from "@/lib/report-engine/report-access-scope";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDraft(value: string | null): ReportOneDocumentDraft | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as ReportOneDocumentDraft;
  } catch {
    return null;
  }
}

export default async function ReportOnePreviewRoute({
  params,
  searchParams,
}: PageProps) {
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

  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const pdfMode = firstParam(resolvedSearchParams.pdf) === "true";

  const report = await prisma.guidanceReport.findFirst({
    where: {
      id: reportId,
      ...buildGuidanceReportWhereForUser(current.user),
    },
  });

  if (!report) {
    notFound();
  }

  if (current.user.role !== "ADMIN") {
    const access = await isServiceAllowedForSchool({
      schoolAccountId: current.user.schoolAccountId || "",
      serviceSlug: report.serviceSlug,
    });

    if (!access.ok) {
      const reason =
        access.reason === "SUBSCRIPTION_INACTIVE"
          ? "activation-required"
          : "service-not-in-plan";

      redirect(
        `/dashboard/plans?reason=${reason}&service=${encodeURIComponent(
          report.serviceSlug,
        )}`,
      );
    }
  }

  const draft = parseDraft(report.editableContent);

  if (!draft) {
    return (
      <main className="min-h-screen bg-[#eef3ef] px-6 py-10" dir="rtl">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-amber-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-black text-amber-600">
            لا يمكن عرض التقرير
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-950">
            لا توجد مسودة report-1 محفوظة لهذا التقرير.
          </h1>
        </section>
      </main>
    );
  }

  return (
    <ReportOnePreviewPage
      reportId={report.id}
      status={String(report.status)}
      draft={draft}
      pdfMode={pdfMode}
    />
  );
}