import { notFound, redirect } from "next/navigation";

import { SavedSmartReportPreviewPage } from "@/components/report-engine/saved-smart-report-preview-page";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";
import { resolveReportVariantId } from "@/lib/report-engine/report-variant-registry";
import { buildGuidanceReportWhereForUser } from "@/lib/report-engine/report-access-scope";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function hasSmartPayload(value: unknown): value is SmartReportPayload {
  const record = asRecord(value);

  return Boolean(record.caseInfo && record.identity && record.service);
}

function formatDate(value: Date | null) {
  if (!value) return "";

  try {
    return value.toLocaleDateString("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return value.toISOString().slice(0, 10);
  }
}

export default async function SavedSmartReportPreviewRoute({
  params,
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

  const resolvedParams = await params;
  const reportId = String(resolvedParams.reportId || "").trim();

  const report = await prisma.guidanceReport.findFirst({
    where: {
      id: reportId,
      ...buildGuidanceReportWhereForUser(current.user),
    },
    include: {
      caseEntry: {
        include: {
          service: true,
        },
      },
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

  if (!hasSmartPayload(report.reportDataSnapshot)) {
    return (
      <main className="min-h-screen bg-[#f5f8f6] px-6 py-10" dir="rtl">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-amber-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-black text-amber-600">
            لا يمكن عرض التقرير
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-950">
            هذا التقرير لا يحتوي على نسخة التقرير الذكي.
          </h1>
        </section>
      </main>
    );
  }

  const templateSnapshot = asRecord(report.templateSnapshot);
  const variantId = resolveReportVariantId(templateSnapshot.variantId);
  const payload = report.reportDataSnapshot;

  return (
    <SavedSmartReportPreviewPage
      reportId={report.id}
      caseId={report.caseEntryId}
      payload={payload}
      variantId={variantId}
      generatedAt={formatDate(report.generatedAt)}
    />
  );
}