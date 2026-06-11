import { redirect } from "next/navigation";

import { requireDashboardUser } from "@/lib/auth/require-auth";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import { SmartReportCasePreviewPage } from "@/components/report-engine/smart-report-case-preview-page";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function SmartReportPreparePage({ params }: PageProps) {
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
  const caseId = String(resolvedParams.caseId || "").trim();

  const result = await buildSmartReportPayloadForCase({
    caseId,
    current,
  });

  if (!result.ok) {
    return (
      <main className="min-h-screen bg-[#f5f8f6] px-6 py-10" dir="rtl">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-black text-red-600">تعذر تجهيز التقرير</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            {result.message}
          </h1>
        </section>
      </main>
    );
  }

  if (current.user.role !== "ADMIN") {
    const access = await isServiceAllowedForSchool({
      schoolAccountId: current.user.schoolAccountId || "",
      serviceSlug: result.serviceSlug,
    });

    if (!access.ok) {
      const reason =
        access.reason === "SUBSCRIPTION_INACTIVE"
          ? "activation-required"
          : "service-not-in-plan";

      redirect(
        `/dashboard/plans?reason=${reason}&service=${encodeURIComponent(
          result.serviceSlug,
        )}`,
      );
    }
  }

  return <SmartReportCasePreviewPage payload={result.payload} />;
}