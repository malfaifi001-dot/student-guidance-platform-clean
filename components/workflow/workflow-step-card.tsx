"use client";

import {
  CommitteeChainRepeater,
  isCommitteeRowsValid,
} from "@/components/committees/committee-chain-repeater";
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
}: WorkflowStepCardProps) {
  const visibleFields = step.fields.filter((field) =>
    shouldShowField(field, values),
  );

  const shouldRenderCommitteeChain =
    serviceSlug === "committees-meetings" && isCommitteeChainStep(step);

  const normalFields = shouldRenderCommitteeChain
    ? visibleFields.filter((field) => !isCommitteeChainField(field))
    : visibleFields;

  const committeeValid = isCommitteeRowsValid(values.committee_items);

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
          <div className="md:col-span-2">
            <CommitteeChainRepeater
              fields={step.fields}
              value={
                Array.isArray(values.committee_items)
                  ? (values.committee_items as any[])
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

        {normalFields.length === 0 && !shouldRenderCommitteeChain ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-400">
            لا توجد حقول ظاهرة في هذه الخطوة حاليًا.
          </div>
        ) : null}
      </div>
    </section>
  );
}
