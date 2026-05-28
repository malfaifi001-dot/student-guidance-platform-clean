import { notFound } from "next/navigation";
import { CaseDetailsView } from "@/components/cases/case-details-view";
import { getCaseById } from "@/engine/cases/case-runtime-engine";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function CaseDetailsPage({ params }: PageProps) {
  const { caseId } = await params;

  try {
    const caseEntry = await getCaseById(caseId);

    return <CaseDetailsView caseEntry={caseEntry} />;
  } catch {
    notFound();
  }
}