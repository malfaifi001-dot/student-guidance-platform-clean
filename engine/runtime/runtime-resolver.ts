import { prisma } from "@/lib/prisma";
import { buildActiveWorkflowSlotQuery } from "@/lib/workflows/active-workflow-resolver";
import { normalizeConditionalWorkflow } from "@/engine/runtime/workflow-conditional-logic";

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
  isRepeater: boolean;
  defaultValue?: string | null;
  defaultJson?: unknown | null;
  autoSelectWhenLinked?: boolean;
  behaviorConfig?: unknown | null;
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
  studentPickerMode?: string | null;
  evidenceMode?: string | null;
  steps: RuntimeStep[];
};

export function sortRuntimeWorkflow(workflow: RuntimeWorkflow): RuntimeWorkflow {
  return normalizeConditionalWorkflow({
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
  });
}

export async function getRuntimeWorkflowByServiceSlug(
  serviceSlug: string,
  workflowType: string = "service-main",
) {
  const service = await prisma.service.findUnique({
    where: {
      slug: serviceSlug,
    },
  });
  if (!service) {
    return null;
  }

  const workflow = await prisma.workflow.findFirst({
    ...buildActiveWorkflowSlotQuery({ serviceId: service.id, workflowType }),
    include: {
      steps: {
        include: {
          fields: { include: { options: true } },
        },
      },
    },
  });

  if (!workflow) return null;

  return {
    service,
    workflow: sortRuntimeWorkflow({
      id: workflow.id,
      name: workflow.name,
      serviceSlug: service.slug,
      workflowType: workflow.workflowType,
      studentPickerMode: workflow.studentPickerMode,
      evidenceMode: workflow.evidenceMode,
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
          isRepeater: field.isRepeater,
          dependsOnFieldKey: field.dependsOnFieldKey,
          linkedToValue: field.linkedToValue,
          defaultValue: field.defaultValue,
          defaultJson: field.defaultJson,
          autoSelectWhenLinked: field.autoSelectWhenLinked,
          behaviorConfig: field.behaviorConfig,
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
