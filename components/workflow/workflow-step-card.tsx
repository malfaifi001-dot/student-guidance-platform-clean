"use client";

import { CommitteeChainRepeater } from "@/components/committees/committee-chain-repeater";
import { DynamicFieldRenderer } from "@/components/workflow/dynamic-field-renderer";
import {
  shouldShowField,
  type RuntimeValues,
} from "@/engine/runtime/field-dependency-engine";
import type { RuntimeField, RuntimeStep } from "@/engine/runtime/runtime-resolver";

type WorkflowStepCardProps = {
  step: RuntimeStep;
  values: RuntimeValues;
  serviceSlug: string;
  onChange: (key: string, value: unknown) => void;
};

function textOf(field: RuntimeField) {
  return `${field.key} ${field.label}`.toLowerCase();
}

function isAgendaField(field: RuntimeField) {
  const text = textOf(field);
  return (
    text.includes("agenda") ||
    text.includes("جدول الأعمال") ||
    text.includes("جدول الاعمال")
  );
}

function isDiscussionField(field: RuntimeField) {
  const text = textOf(field);
  return (
    text.includes("discussion") ||
    text.includes("محور") ||
    text.includes("محاور") ||
    text.includes("النقاش")
  );
}

function isRecommendationField(field: RuntimeField) {
  const text = textOf(field);
  return (
    text.includes("recommendation") ||
    text.includes("توصية") ||
    text.includes("التوصية") ||
    text.includes("التوصيات")
  );
}

function isCommitteeChainField(field: RuntimeField) {
  return isAgendaField(field) || isDiscussionField(field) || isRecommendationField(field);
}

function hasCommitteeChain(fields: RuntimeField[]) {
  return (
    fields.some(isAgendaField) &&
    fields.some(isDiscussionField) &&
    fields.some(isRecommendationField)
  );
}

export function WorkflowStepCard({
  step,
  values,
  serviceSlug,
  onChange,
}: WorkflowStepCardProps) {
  const visibleFields = step.fields.filter((field) =>
    shouldShowField(field, values)
  );

  const shouldRenderCommitteeChain =
    serviceSlug === "committees-meetings" && hasCommitteeChain(step.fields);

  const normalFields = shouldRenderCommitteeChain
    ? visibleFields.filter((field) => !isCommitteeChainField(field))
    : visibleFields;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-slate-100 pb-5">
        <p className="text-sm font-bold text-sky-700">الخطوة {step.order}</p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          {step.title}
        </h2>

        {step.description ? (
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {step.description}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {normalFields.map((field) => (
          <div
            key={field.id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <DynamicFieldRenderer
              field={field}
              value={values[field.key]}
              values={values}
              onChange={(key, value) => onChange(key, value)}
            />
          </div>
        ))}

        {shouldRenderCommitteeChain ? (
          <CommitteeChainRepeater
            fields={step.fields}
            value={
              Array.isArray(values.committee_items)
                ? (values.committee_items as any[])
                : undefined
            }
            onChange={(rows) => onChange("committee_items", rows)}
          />
        ) : null}

        {normalFields.length === 0 && !shouldRenderCommitteeChain ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-400">
            لا توجد حقول ظاهرة في هذه الخطوة حاليًا.
          </div>
        ) : null}
      </div>
    </section>
  );
}