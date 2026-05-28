"use client";

import { DynamicFieldRenderer } from "@/components/workflow/dynamic-field-renderer";
import {
  shouldShowField,
  type RuntimeValues,
} from "@/engine/runtime/field-dependency-engine";
import type { RuntimeStep } from "@/engine/runtime/runtime-resolver";

type WorkflowStepCardProps = {
  step: RuntimeStep;
  values: RuntimeValues;
  onChange: (key: string, value: unknown) => void;
};

export function WorkflowStepCard({
  step,
  values,
  onChange,
}: WorkflowStepCardProps) {
  const visibleFields = step.fields.filter((field) =>
    shouldShowField(field, values)
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-slate-100 pb-5">
        <p className="text-sm font-bold text-sky-700">
          الخطوة {step.order}
        </p>

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
        {visibleFields.map((field) => (
          <div
            key={field.id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <DynamicFieldRenderer
              field={field}
              value={values[field.key]}
              onChange={(key, value) => onChange(key, value)}
            />
          </div>
        ))}

        {visibleFields.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-400">
            لا توجد حقول ظاهرة في هذه الخطوة حاليًا.
          </div>
        ) : null}
      </div>
    </section>
  );
}