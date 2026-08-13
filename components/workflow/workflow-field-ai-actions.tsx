"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import type { RuntimeField, RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";
import {
  parseWorkflowFieldBehaviorConfig,
  supportsWorkflowFieldAi,
  WORKFLOW_AI_ACTION_LABELS,
  type WorkflowAiAction,
} from "@/lib/workflows/field-behavior-config";

type Props = {
  field: RuntimeField;
  workflow: RuntimeWorkflow;
  values: RuntimeValues;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
};

export function WorkflowFieldAiActions({ field, workflow, values, value, onChange }: Props) {
  const [loadingAction, setLoadingAction] = useState<WorkflowAiAction | null>(null);
  const [error, setError] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState("");
  const config = parseWorkflowFieldBehaviorConfig(field.behaviorConfig).ai;
  const hasCurrentText = Boolean(String(value ?? "").trim());

  if (!config?.enabled || !supportsWorkflowFieldAi(field.type, field.isRepeater)) return null;

  async function requestSuggestion(action: WorkflowAiAction) {
    try {
      setLoadingAction(action);
      setError("");
      const response = await fetch("/api/dashboard/workflows/field-ai-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id, fieldId: field.id, action, values }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.suggestion !== "string") {
        throw new Error(data.error || "تعذر إعداد الاقتراح.");
      }
      if (String(value ?? "").trim()) {
        setPendingSuggestion(data.suggestion);
      } else {
        onChange(field.key, data.suggestion);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إعداد الاقتراح.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {config.actions.map((action) => {
          const requiresCurrentText = ["IMPROVE", "REWRITE", "SUMMARIZE", "COMPLETE"].includes(action);
          return (
            <button
              key={action}
              type="button"
              onClick={() => void requestSuggestion(action)}
              disabled={loadingAction !== null || (requiresCurrentText && !hasCurrentText)}
              title={requiresCurrentText && !hasCurrentText ? "اكتب نصًا في الحقل أولًا" : undefined}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loadingAction === action ? "جاري إعداد الاقتراح..." : WORKFLOW_AI_ACTION_LABELS[action]}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
      <SmartFeedbackModal
        open={Boolean(pendingSuggestion)}
        type="warning"
        title="استبدال النص الحالي؟"
        description="يوجد محتوى في الحقل. لن يتم استبداله إلا بعد موافقتك، ويمكنك تعديل الاقتراح بعد إدراجه."
        primaryActionLabel="إدراج الاقتراح"
        secondaryActionLabel="إلغاء"
        onPrimaryAction={() => {
          onChange(field.key, pendingSuggestion);
          setPendingSuggestion("");
        }}
        onSecondaryAction={() => setPendingSuggestion("")}
        onOpenChange={(open) => {
          if (!open) setPendingSuggestion("");
        }}
      />
    </div>
  );
}
