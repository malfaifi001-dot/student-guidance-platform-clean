import { notFound } from "next/navigation";

import { ReportTwoSnapshotPreview } from "@/components/report-2/report-two-snapshot-preview";
import { ReportTwoSnapshotPrintController } from "@/components/report-2/report-two-snapshot-print-controller";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { getReportTwoSnapshotById } from "@/lib/report-2/report-snapshot-service";

type PageProps = {
  params: Promise<{
    snapshotId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportTwoSnapshotPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const context = await requireDashboardPageContext();
  const { snapshotId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const printMode = firstParam(resolvedSearchParams.print) === "1";
  const snapshot = await getReportTwoSnapshotById(context, snapshotId);

  if (!snapshot) {
    notFound();
  }

  return (
    <>
      {printMode ? <ReportTwoSnapshotPrintController /> : null}
      <ReportTwoSnapshotPreview
        snapshot={snapshot}
        printMode={printMode}
      />
    </>
  );
}
