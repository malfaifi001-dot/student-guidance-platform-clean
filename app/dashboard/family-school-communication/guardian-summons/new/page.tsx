import { GuardianSummonsNewClient } from "@/components/family-school-communication/guardian-summons-new-client";
import { prisma } from "@/lib/prisma";
import { WORKFLOW_TYPES } from "@/lib/workflows/workflow-types";

async function getGuardianSummonsWorkflow() {
  const service = await prisma.service.findFirst({
    where: {
      slug: "family-school-communication",
    },
  });

  if (!service) {
    return null;
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      serviceId: service.id,
      workflowType: WORKFLOW_TYPES.GUARDIAN_SUMMONS,
      isActive: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      steps: {
        include: {
          fields: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!workflow) {
    return null;
  }

  return {
    id: workflow.id,
    name: workflow.name,
    serviceSlug: service.slug,
    steps: workflow.steps
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        order: step.order,
        fields: step.fields
          .sort((a, b) => a.order - b.order)
          .map((field) => ({
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
            options: field.options
              .sort((a, b) => a.order - b.order)
              .map((option) => ({
                id: option.id,
                label: option.label,
                value: option.value,
                order: option.order,
                linkedToValue: option.linkedToValue,
              })),
          })),
      })),
  };
}

export default async function NewGuardianSummonsPage() {
  const workflow = await getGuardianSummonsWorkflow();

  return <GuardianSummonsNewClient workflow={workflow} />;
}
