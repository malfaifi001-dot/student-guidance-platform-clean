import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function GuardianSummonsCasePage({ params }: PageProps) {
  const { caseId } = await params;

  redirect(`/dashboard/cases/${caseId}`);
}
