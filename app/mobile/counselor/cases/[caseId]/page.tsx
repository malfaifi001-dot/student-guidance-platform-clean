import { notFound, redirect } from "next/navigation";

import { CounselorMobileApp } from "@/components/mobile/counselor-mobile-app";
import { MobileCaseDetails } from "@/components/mobile/mobile-case-details";
import { getCaseById } from "@/engine/cases/case-runtime-engine";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { getLatestReportTwoSnapshotForCase } from "@/lib/report-2/report-snapshot-service";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

const reservedCaseActions = new Set(["new", "active", "drafts", "evidence"]);

export default async function MobileCaseDetailsPage({ params }: PageProps) {
  const { caseId } = await params;

  if (reservedCaseActions.has(caseId)) {
    return <CounselorMobileApp initialSection="cases" initialAction={caseId} />;
  }

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
      <MobileCaseDetails
        caseEntry={caseEntry}
        reportTwoSnapshotId={snapshot?.id || null}
      />
    );
  } catch {
    notFound();
  }
}