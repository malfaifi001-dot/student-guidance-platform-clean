"use client";

import type { ReactNode } from "react";

import type { RuntimeField } from "@/engine/runtime/runtime-resolver";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";

type MobileDynamicFieldProps = {
  field: RuntimeField;
  value: unknown;
  values: RuntimeValues;
  onChange: (key: string, value: unknown) => void;
};

const OTHER_VALUE = "__OTHER__";
const OPTION_SCROLL_LIMIT = 4;

function asString(value: unknown) {
  return typeof value === "string"
    ? value
    : value === null || value === undefined
      ? ""
      : String(value);
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function getFieldType(field: RuntimeField) {
  return String(field.type || "TEXT").trim().toUpperCase();
}

function baseInputClass() {
  return "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
}

function optionsListClass(optionsCount: number, allowOther?: boolean) {
  const totalOptions = optionsCount + (allowOther ? 1 : 0);

  return [
    "grid gap-2",
    totalOptions > OPTION_SCROLL_LIMIT
      ? "max-h-[15.25rem] overflow-y-auto rounded-[1.15rem] pr-1 [scrollbar-width:thin]"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function FieldShell({
  field,
  children,
}: {
  field: RuntimeField;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.35rem] bg-white/85 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl">
      <div className="mb-2">
        <label className="text-sm font-black leading-6 text-slate-950">
          {field.label}
          {field.isRequired ? <span className="mx-1 text-rose-500">*</span> : null}
        </label>

        {field.helpText ? (
          <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">
            {field.helpText}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function OtherInput({
  field,
  values,
  onChange,
}: {
  field: RuntimeField;
  values: RuntimeValues;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <input
      value={asString(values[`${field.key}__other`])}
      onChange={(event) => onChange(`${field.key}__other`, event.target.value)}
      placeholder="اكتب قيمة أخرى..."
      className={`${baseInputClass()} mt-2`}
    />
  );
}

function SingleChoiceField({
  field,
  value,
  values,
  onChange,
}: MobileDynamicFieldProps) {
  const selectedValue = asString(value);

  return (
    <FieldShell field={field}>
      <div className={optionsListClass(field.options.length, field.allowOther)}>
        {field.options.map((option) => {
          const active = selectedValue === option.value;

          return (
            <button
              key={option.id || option.value}
              type="button"
              onClick={() => onChange(field.key, option.value)}
              className={[
                "flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-right text-sm font-black transition",
                active
                  ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-100",
              ].join(" ")}
            >
              <span className="leading-6">{option.label}</span>
              <span className={active ? "text-sky-600" : "text-slate-300"}>
                {active ? "✓" : ""}
              </span>
            </button>
          );
        })}

        {field.allowOther ? (
          <button
            type="button"
            onClick={() => onChange(field.key, OTHER_VALUE)}
            className={[
              "flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-right text-sm font-black transition",
              selectedValue === OTHER_VALUE
                ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                : "bg-slate-50 text-slate-700 ring-1 ring-slate-100",
            ].join(" ")}
          >
            <span>أخرى</span>
            <span>{selectedValue === OTHER_VALUE ? "✓" : ""}</span>
          </button>
        ) : null}
      </div>

      {selectedValue === OTHER_VALUE ? (
        <OtherInput field={field} values={values} onChange={onChange} />
      ) : null}
    </FieldShell>
  );
}

function MultiChoiceField({
  field,
  value,
  values,
  onChange,
}: MobileDynamicFieldProps) {
  const selectedValues = asStringArray(value);

  function toggle(optionValue: string) {
    const next = selectedValues.includes(optionValue)
      ? selectedValues.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue];

    onChange(field.key, next);
  }

  return (
    <FieldShell field={field}>
      <div className={optionsListClass(field.options.length, field.allowOther)}>
        {field.options.map((option) => {
          const active = selectedValues.includes(option.value);

          return (
            <button
              key={option.id || option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={[
                "flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-right text-sm font-black transition",
                active
                  ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-100",
              ].join(" ")}
            >
              <span className="leading-6">{option.label}</span>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-xs text-sky-700">
                {active ? "✓" : ""}
              </span>
            </button>
          );
        })}

        {field.allowOther ? (
          <button
            type="button"
            onClick={() => toggle(OTHER_VALUE)}
            className={[
              "flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-right text-sm font-black transition",
              selectedValues.includes(OTHER_VALUE)
                ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                : "bg-slate-50 text-slate-700 ring-1 ring-slate-100",
            ].join(" ")}
          >
            <span>أخرى</span>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-xs text-sky-700">
              {selectedValues.includes(OTHER_VALUE) ? "✓" : ""}
            </span>
          </button>
        ) : null}
      </div>

      {selectedValues.includes(OTHER_VALUE) ? (
        <OtherInput field={field} values={values} onChange={onChange} />
      ) : null}
    </FieldShell>
  );
}

export function MobileDynamicField({
  field,
  value,
  values,
  onChange,
}: MobileDynamicFieldProps) {
  const type = getFieldType(field);

  if (
    type === "SELECT" ||
    type === "SINGLE_SELECT" ||
    type === "RADIO" ||
    type === "DROPDOWN"
  ) {
    return (
      <SingleChoiceField
        field={field}
        value={value}
        values={values}
        onChange={onChange}
      />
    );
  }

  if (type === "MULTI_SELECT" || type === "CHECKBOX") {
    if (field.options.length) {
      return (
        <MultiChoiceField
          field={field}
          value={value}
          values={values}
          onChange={onChange}
        />
      );
    }

    return (
      <FieldShell field={field}>
        <button
          type="button"
          onClick={() => onChange(field.key, !Boolean(value))}
          className={[
            "flex min-h-12 items-center justify-between rounded-2xl px-4 py-3 text-sm font-black",
            Boolean(value)
              ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
              : "bg-slate-50 text-slate-700 ring-1 ring-slate-100",
          ].join(" ")}
        >
          <span>{Boolean(value) ? "محدد" : "غير محدد"}</span>
          <span>{Boolean(value) ? "✓" : ""}</span>
        </button>
      </FieldShell>
    );
  }

  if (type === "TEXTAREA" || type === "LONG_TEXT") {
    return (
      <FieldShell field={field}>
        <textarea
          value={asString(value)}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder || "اكتب هنا..."}
          rows={4}
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
      </FieldShell>
    );
  }

  const inputType =
    type === "NUMBER"
      ? "number"
      : type === "DATE"
        ? "date"
        : type === "EMAIL"
          ? "email"
          : type === "PHONE"
            ? "tel"
            : "text";

  return (
    <FieldShell field={field}>
      <input
        type={inputType}
        value={asString(value)}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder || "اكتب هنا..."}
        className={baseInputClass()}
      />
    </FieldShell>
  );
}