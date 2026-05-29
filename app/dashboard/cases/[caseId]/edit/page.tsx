import { notFound } from "next/navigation";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { prisma } from "@/lib/prisma";
import { sortRuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function EditCasePage({ params }: PageProps) {
  const { caseId } = await params;

  const caseEntry = await prisma.caseEntry.findUnique({
    where: {
      id: caseId,
    },
    include: {
      values: true,
      evidences: true,
      service: true,
      workflow: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  if (!caseEntry || !caseEntry.workflow || !caseEntry.service) {
    notFound();
  }

  const initialValues = Object.fromEntries(
    caseEntry.values.map((value) => [
      value.fieldKey,
      value.jsonValue ?? value.value,
    ])
  );

  const workflow = sortRuntimeWorkflow({
    id: caseEntry.workflow.id,
    name: caseEntry.workflow.name,
    serviceSlug: caseEntry.service.slug,
    steps: caseEntry.workflow.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        dependsOnFieldKey: field.dependsOnFieldKey,
        linkedToValue: field.linkedToValue,
        allowOther: field.allowOther,
        options: field.options.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  });

  const evidenceItems = caseEntry.evidences.map((item) => ({
    id: item.id,
    fileName: item.fileName || "ملف",
    fileUrl: item.fileUrl || "#",
    mimeType: item.mimeType || "application/octet-stream",
    size: item.size || 0,
  }));

  return (
    <DynamicFormRenderer
      workflow={workflow}
      serviceId={caseEntry.serviceId}
      caseId={caseEntry.id}
      title={caseEntry.title ?? undefined}
      initialValues={initialValues}
      initialEvidenceItems={evidenceItems}
    />
  );
}