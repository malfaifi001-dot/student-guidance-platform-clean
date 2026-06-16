import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function LegacyActivityCardReportRedirectPage({
  params,
}: PageProps) {
  const resolvedParams = await params;
  const caseId = String(resolvedParams.caseId || "").trim();

  redirect(
    `/dashboard/report-2/cases/${encodeURIComponent(caseId)}/prepare?variant=official-activity-card`,
  );
}
