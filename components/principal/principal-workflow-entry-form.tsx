"use client";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import type {
  DynamicFormRendererSaveHandler,
} from "@/components/workflow/dynamic-form-renderer";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

type Props = {
  itemSlug: string;
  itemTitle: string;
  itemHref: string;
  serviceId: string;
  workflow: RuntimeWorkflow;
};

export function PrincipalWorkflowEntryForm({
  itemSlug,
  itemTitle,
  itemHref,
  serviceId,
  workflow,
}: Props) {
  const save: DynamicFormRendererSaveHandler = async (params) => {
    const response = await fetch(
      `/api/dashboard/principal/performance/${encodeURIComponent(itemSlug)}/entries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "workflow",
          workflowId: params.workflow.id,
          serviceId: params.serviceId,
          title: params.title,
          values: params.values,
          evidenceItems: params.evidenceItems,
          status: params.type === "draft" ? "DRAFT" : "SUBMITTED",
        }),
      },
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "تعذر حفظ السجل.");
    }

    return {
      redirectTo: itemHref,
      feedbackTitle: params.type === "draft" ? "تم حفظ المسودة" : "تم حفظ السجل",
      feedbackMessage: result.message,
    };
  };

  return (
    <DynamicFormRenderer
      workflow={workflow}
      serviceId={serviceId}
      requiresStudent={false}
      title={itemTitle}
      onSave={save}
      submitLabel="حفظ"
    />
  );
}
