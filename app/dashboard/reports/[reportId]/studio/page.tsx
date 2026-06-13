import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function LegacyReportStudioRedirectPage({
  params,
}: PageProps) {
  const resolvedParams = await params;
  const reportId = String(resolvedParams.reportId || "").trim();

  redirect(`/dashboard/report/${reportId}/preview`);
}