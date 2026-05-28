import { notFound } from "next/navigation";
import { DynamicFormResume } from "@/components/workflow/dynamic-form-resume";
import { getCaseById } from "@/engine/cases/case-runtime-engine";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function EditCasePage({ params }: PageProps) {
  const { caseId } = await params;

  try {
    const caseEntry = await getCaseById(caseId);

    if (!caseEntry.workflow) {
      notFound();
    }

    return <DynamicFormResume caseId={caseId} caseEntry={caseEntry} />;
  } catch {
    notFound();
  }
}