import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";

type DynamicFormResumeProps = {
  caseId: string;
  caseEntry: any;
};

function buildRuntimeWorkflow(caseEntry: any) {
  return {
    id: caseEntry.workflow.id,
    name: caseEntry.workflow.name,
    serviceSlug: caseEntry.service.slug,
    steps: caseEntry.workflow.steps
      .sort((a: any, b: any) => a.order - b.order)
      .map((step: any) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        order: step.order,
        fields: step.fields
          .sort((a: any, b: any) => a.order - b.order)
          .map((field: any) => ({
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
              .sort((a: any, b: any) => a.order - b.order)
              .map((option: any) => ({
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

function restoreValues(caseEntry: any): RuntimeValues {
  return Object.fromEntries(
    caseEntry.values.map((value: any) => [
      value.fieldKey,
      value.jsonValue ?? value.value,
    ])
  );
}

export function DynamicFormResume({
  caseId,
  caseEntry,
}: DynamicFormResumeProps) {
  return (
    <DynamicFormRenderer
      caseId={caseId}
      workflow={buildRuntimeWorkflow(caseEntry)}
      serviceId={caseEntry.service.id}
      requiresStudent={Boolean(caseEntry.student)}
      title={caseEntry.title || caseEntry.workflow.name}
      initialValues={restoreValues(caseEntry)}
    />
  );
}