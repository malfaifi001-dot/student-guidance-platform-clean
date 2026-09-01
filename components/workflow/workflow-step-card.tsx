"use client";

import {
  CommitteeChainRepeater,
  isCommitteeRowsValid,
  type CommitteeChainRow,
} from "@/components/committees/committee-chain-repeater";
import {
  BroadcastScheduleRepeater,
  getBroadcastScheduleValidation,
  isBroadcastScheduleField,
  isBroadcastScheduleStep,
} from "@/components/activity/broadcast-schedule-repeater";
import { DynamicFieldRenderer } from "@/components/workflow/dynamic-field-renderer";
import { GripVertical } from "lucide-react";
import {
  shouldShowField,
  type RuntimeValues,
} from "@/engine/runtime/field-dependency-engine";
import type { RuntimeField, RuntimeStep, RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import { getVisibleWorkflowStepDescription } from "@/lib/workflows/workflow-runtime-copy";

type WorkflowStepCardProps = {
  step: RuntimeStep;
  values: RuntimeValues;
  serviceSlug: string;
  onChange: (key: string, value: unknown) => void;
  canEditFieldLabel?: (field: RuntimeField) => boolean;
  onUpdateFieldLabel?: (
    fieldId: string,
    fieldKey: string,
    label: string
  ) => Promise<void> | void;
  embedded?: boolean;
  workflow: RuntimeWorkflow;
  editingMode?: boolean;
  selectedFieldId?: string | null;
  onSelectField?: (field: RuntimeField) => void;
  onReorderFields?: (stepId: string, fieldIds: string[]) => Promise<void> | void;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

function textOf(field: RuntimeField) {
  return normalizeText(`${field.key} ${field.label}`);
}

function isAgendaField(field: RuntimeField) {
  const text = textOf(field);

  return (
    text.includes("agenda") ||
    text.includes("committee_agenda") ||
    text.includes("جدول") ||
    text.includes("الأعمال") ||
    text.includes("الاعمال")
  );
}

function isDiscussionField(field: RuntimeField) {
  const text = textOf(field);

  return (
    text.includes("discussion") ||
    text.includes("committee_discussion") ||
    text.includes("محور") ||
    text.includes("نقاش")
  );
}

function isRecommendationField(field: RuntimeField) {
  const text = textOf(field);

  return (
    text.includes("recommendation") ||
    text.includes("committee_recommendation") ||
    text.includes("توصية") ||
    text.includes("التوصية") ||
    text.includes("التوصيات")
  );
}

function isCommitteeChainField(field: RuntimeField) {
  return (
    isAgendaField(field) ||
    isDiscussionField(field) ||
    isRecommendationField(field)
  );
}

export function isCommitteeChainStep(step?: RuntimeStep | null) {
  if (!step) return false;

  return (
    step.fields.some(isAgendaField) &&
    step.fields.some(isDiscussionField) &&
    step.fields.some(isRecommendationField)
  );
}

export function WorkflowStepCard({
  step,
  values,
  serviceSlug,
  onChange,
  canEditFieldLabel,
  onUpdateFieldLabel,
  embedded = false,
  workflow,
  editingMode = false,
  selectedFieldId,
  onSelectField,
  onReorderFields,
}: WorkflowStepCardProps) {
  const visibleFields = step.fields.filter((field) =>
    shouldShowField(field, values),
  );

  const shouldRenderCommitteeChain =
    serviceSlug === "committees-meetings" && isCommitteeChainStep(step);
  const shouldRenderBroadcastSchedule =
    serviceSlug === "activity-programs-school-broadcast" && isBroadcastScheduleStep(step);

  const normalFields = visibleFields.filter((field) =>
    shouldRenderCommitteeChain
      ? !isCommitteeChainField(field)
      : shouldRenderBroadcastSchedule
        ? !isBroadcastScheduleField(field)
        : true,
  );

  const committeeValid = isCommitteeRowsValid(values.committee_items);
  const broadcastValidation = getBroadcastScheduleValidation(values.broadcast_schedule_items, step.fields);
  const visibleStepDescription = getVisibleWorkflowStepDescription(
    step.description,
  );

  return (
    <section
      className={
        embedded
          ? "py-1"
          : "rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4"
      }
    >
      {embedded && visibleStepDescription ? (
        <p className="mb-3 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
          {visibleStepDescription}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {normalFields.map((field) => (
          <div
            key={field.id}
            draggable={editingMode}
            onDragStart={(event) => event.dataTransfer.setData("text/workflow-field-id", field.id)}
            onDragOver={(event) => {
              if (editingMode) event.preventDefault();
            }}
            onDrop={(event) => {
              if (!editingMode || !onReorderFields) return;
              event.preventDefault();
              const sourceId = event.dataTransfer.getData("text/workflow-field-id");
              if (!sourceId || sourceId === field.id) return;
              const ids = normalFields.map((item) => item.id);
              const sourceIndex = ids.indexOf(sourceId);
              const targetIndex = ids.indexOf(field.id);
              if (sourceIndex < 0 || targetIndex < 0) return;
              ids.splice(sourceIndex, 1);
              ids.splice(targetIndex, 0, sourceId);
              const visibleIdSet = new Set(ids);
              let visibleIndex = 0;
              const completeOrder = step.fields.map((item) =>
                visibleIdSet.has(item.id) ? ids[visibleIndex++] : item.id,
              );
              void onReorderFields(step.id, completeOrder);
            }}
            onClickCapture={() => {
              if (editingMode) onSelectField?.(field);
            }}
            className={[
              "relative animate-in fade-in slide-in-from-bottom-2 duration-300",
              editingMode ? "cursor-pointer rounded-2xl ring-2 ring-transparent transition hover:ring-sky-300" : "",
              selectedFieldId === field.id ? "ring-2 ring-sky-500" : "",
            ].join(" ")}
          >
            {editingMode ? (
              <span className="absolute left-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white shadow-lg" title="اسحب لإعادة الترتيب">
                <GripVertical className="h-4 w-4" />
              </span>
            ) : null}
            <DynamicFieldRenderer
              field={field}
              workflow={workflow}
              value={values[field.key]}
              values={values}
              onChange={(key, value) => onChange(key, value)}
              canEditFieldLabel={canEditFieldLabel?.(field) ?? false}
              onUpdateFieldLabel={onUpdateFieldLabel}
            />
          </div>
        ))}

        {shouldRenderCommitteeChain ? (
          <div className="md:col-span-2">
            <CommitteeChainRepeater
              fields={step.fields}
              values={values}
              value={
                Array.isArray(values.committee_items)
                  ? (values.committee_items as CommitteeChainRow[])
                  : undefined
              }
              onChange={(rows) => onChange("committee_items", rows)}
            />

            {!committeeValid ? (
              <p className="mt-3 text-sm font-bold text-rose-500">
                يجب إكمال صف واحد على الأقل: جدول أعمال + محور نقاش + توصية.
              </p>
            ) : null}
          </div>
        ) : null}

        {shouldRenderBroadcastSchedule ? (
          <div className="md:col-span-2">
            <BroadcastScheduleRepeater
              fields={step.fields}
              value={values.broadcast_schedule_items}
              onChange={(rows) => onChange("broadcast_schedule_items", rows)}
            />
            {!broadcastValidation.valid ? (
              <p className="mt-3 text-sm font-bold text-rose-500">
                أكمل الحقول التالية في السطر {Number(broadcastValidation.rowIndex) + 1}: {broadcastValidation.missing?.join("، ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {normalFields.length === 0 && !shouldRenderCommitteeChain && !shouldRenderBroadcastSchedule ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            لا توجد حقول ظاهرة في هذه الخطوة حاليًا.
          </div>
        ) : null}
      </div>
    </section>
  );
}
