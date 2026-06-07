"use client";

import type {
  RuntimeField,
  RuntimeOption,
} from "@/engine/runtime/runtime-resolver";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";

type DynamicFieldRendererProps = {
  field: RuntimeField;
  value: unknown;
  values: RuntimeValues;
  onChange: (key: string, value: unknown) => void;
};

function FieldLabel({ field }: { field: RuntimeField }) {
  return (
    <label className="mb-3 block text-sm font-black text-slate-800">
      {field.label}
      {field.isRequired ? <span className="mr-1 text-rose-500">*</span> : null}
    </label>
  );
}

function HelpText({ text }: { text?: string | null }) {
  if (!text) return null;

  return <p className="mt-2 text-xs leading-6 text-slate-400">{text}</p>;
}

function getFilteredOptions(field: RuntimeField, values: RuntimeValues) {
  if (!field.dependsOnFieldKey) return field.options;

  const parentValue = values[field.dependsOnFieldKey];

  return field.options.filter((option) => {
    if (!option.linkedToValue) return true;

    if (Array.isArray(parentValue)) {
      return parentValue.includes(option.linkedToValue);
    }

    return String(parentValue ?? "") === String(option.linkedToValue);
  });
}

function SelectOptions({
  options,
  allowOther,
}: {
  options: RuntimeOption[];
  allowOther: boolean;
}) {
  return (
    <>
      <option value="">اختر...</option>
      {options.map((option) => (
        <option key={option.id} value={option.value}>
          {option.label}
        </option>
      ))}
      {allowOther ? <option value="__OTHER__">أخرى</option> : null}
    </>
  );
}

export function DynamicFieldRenderer({
  field,
  value,
  values,
  onChange,
}: DynamicFieldRendererProps) {
  const baseInputClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

  const filteredOptions = getFilteredOptions(field, values);

  if (
    field.type === "TEXT" ||
    field.type === "NUMBER" ||
    field.type === "DATE"
  ) {
    return (
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm">
        <FieldLabel field={field} />

        <input
          type={
            field.type === "NUMBER"
              ? "number"
              : field.type === "DATE"
                ? "date"
                : "text"
          }
          value={String(value ?? "")}
          placeholder={field.placeholder ?? ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          className={baseInputClass}
        />

        <HelpText text={field.helpText} />
      </div>
    );
  }

  if (field.type === "TEXTAREA" || field.type === "RICH_TEXT") {
    return (
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm">
        <FieldLabel field={field} />

        <textarea
          value={String(value ?? "")}
          placeholder={field.placeholder ?? ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          rows={5}
          className={baseInputClass}
        />

        <HelpText text={field.helpText} />
      </div>
    );
  }

  if (field.type === "SELECT" || field.type === "RADIO") {
    return (
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm">
        <FieldLabel field={field} />

        <select
          value={String(value ?? "")}
          onChange={(event) => onChange(field.key, event.target.value)}
          className={baseInputClass}
        >
          <SelectOptions
            options={filteredOptions}
            allowOther={field.allowOther}
          />
        </select>

        {value === "__OTHER__" ? (
          <input
            value={String(values[`${field.key}__other`] ?? "")}
            onChange={(event) =>
              onChange(`${field.key}__other`, event.target.value)
            }
            placeholder="اكتب خيارًا آخر..."
            className={baseInputClass}
          />
        ) : null}

        <HelpText text={field.helpText} />
      </div>
    );
  }

  if (field.type === "MULTI_SELECT" || field.type === "CHECKBOX") {
    const selectedValues = Array.isArray(value) ? value.map(String) : [];

    const allOptions = [
      ...filteredOptions,
      ...(field.allowOther
        ? [
            {
              id: "__other__",
              label: "أخرى",
              value: "__OTHER__",
              order: 999,
              linkedToValue: null,
            },
          ]
        : []),
    ];

    return (
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm">
        <FieldLabel field={field} />

        <div className="grid gap-2 md:grid-cols-2">
          {allOptions.map((option) => {
            const checked = selectedValues.includes(option.value);

            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((item) => item !== option.value);

                    onChange(field.key, next);
                  }}
                />

                {option.label}
              </label>
            );
          })}
        </div>

        {selectedValues.includes("__OTHER__") ? (
          <input
            value={String(values[`${field.key}__other`] ?? "")}
            onChange={(event) =>
              onChange(`${field.key}__other`, event.target.value)
            }
            placeholder="اكتب خيارًا آخر..."
            className={baseInputClass}
          />
        ) : null}

        <HelpText text={field.helpText} />
      </div>
    );
  }

  if (field.type === "FILE_UPLOAD" || field.type === "IMAGE_UPLOAD") {
    return (
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm">
        <FieldLabel field={field} />

        <input
          type="file"
          accept={field.type === "IMAGE_UPLOAD" ? "image/*" : undefined}
          onChange={(event) =>
            onChange(field.key, event.target.files?.[0] ?? null)
          }
          className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm"
        />

        <HelpText text={field.helpText} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
      نوع الحقل غير مدعوم حاليًا: {field.type}
    </div>
  );
}
