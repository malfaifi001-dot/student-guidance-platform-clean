import { prisma } from "@/lib/prisma";

export type RuntimeOption = {
  id: string;
  label: string;
  value: string;
  order: number;
  linkedToValue?: string | null;
};

export type RuntimeField = {
  id: string;
  key: string;
  label: string;
  type: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  dependsOnFieldKey?: string | null;
  linkedToValue?: string | null;
  allowOther: boolean;
  options: RuntimeOption[];
};

export type RuntimeStep = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  fields: RuntimeField[];
};

export type RuntimeWorkflow = {
  id: string;
  name: string;
  serviceSlug: string;
  workflowType?: string;
  steps: RuntimeStep[];
};

export function sortRuntimeWorkflow(workflow: RuntimeWorkflow): RuntimeWorkflow {
  return {
    ...workflow,
    steps: [...workflow.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        ...step,
        fields: [...step.fields]
          .sort((a, b) => a.order - b.order)
          .map((field) => ({
            ...field,
            options: [...field.options].sort((a, b) => a.order - b.order),
          })),
      })),
  };
}

export async function getRuntimeWorkflowByServiceSlug(
  serviceSlug: string,
  workflowType = "default",
) {
  const service = await prisma.service.findUnique({
    where: {
      slug: serviceSlug,
    },
    include: {
      workflows: {
        where: {
          isActive: true,
          status: "ACTIVE",
          workflowType,
        },
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
        orderBy: {
          version: "desc",
        },
        take: 1,
      },
    },
  });

  const workflow = service?.workflows[0];

  if (!service || !workflow) {
    return null;
  }

  return {
    service,
    workflow: sortRuntimeWorkflow({
      id: workflow.id,
      name: workflow.name,
      serviceSlug: service.slug,
      workflowType: workflow.workflowType,
      steps: workflow.steps.map((step) => ({
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
          allowOther: field.allowOther,
          dependsOnFieldKey: field.dependsOnFieldKey,
          linkedToValue: field.linkedToValue,
          options: field.options.map((option) => ({
            id: option.id,
            label: option.label,
            value: option.value,
            order: option.order,
            linkedToValue: option.linkedToValue,
          })),
        })),
      })),
    }),
  };
}
