import { notFound, redirect } from "next/navigation";

import { CaseDetailsView } from "@/components/cases/case-details-view";
import { getCaseById } from "@/engine/cases/case-runtime-engine";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { getLatestReportTwoSnapshotForCase } from "@/lib/report-2/report-snapshot-service";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function CaseDetailsPage({ params }: PageProps) {
  const { caseId } = await params;
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  try {
    const caseEntry = await getCaseById(caseId, {
      schoolAccountId: context.schoolAccountId,
      isAdmin: context.isAdmin,
    });

    const snapshot = await getLatestReportTwoSnapshotForCase(context, caseId);

    return (
      <CaseDetailsView
        caseEntry={caseEntry}
        reportTwoSnapshotId={snapshot?.id || null}
      />
    );
  } catch {
    notFound();
  }
}
