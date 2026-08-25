import { redirect } from "next/navigation";

export default async function AssessmentReportPage({ params }: { params: Promise<{ analysisId: string }> }) {
  redirect(`/dashboard/assessments-center/${(await params).analysisId}/print?print=1`);
}
