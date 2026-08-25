"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { RuntimeField, RuntimeOption } from "@/engine/runtime/runtime-resolver";
import { parseBroadcastScheduleRows } from "@/lib/activity-programs/broadcast-schedule";
import { repairPotentialUtf8Mojibake } from "@/lib/text/repair-utf8-mojibake";

export const BROADCAST_SCHEDULE_VALUE_KEY = "broadcast_schedule_items";

export const BROADCAST_SCHEDULE_FIELD_KEYS = [
  "broadcast_week",
  "broadcast_day",
  "broadcast_date",
  "broadcast_grade",
  "broadcast_classroom",
  "broadcast_topic",
  "broadcast_responsible",
] as const;

export type BroadcastScheduleFieldKey = (typeof BROADCAST_SCHEDULE_FIELD_KEYS)[number];
export type BroadcastScheduleRowKey =
  | "week"
  | "day"
  | "date"
  | "grade"
  | "classroom"
  | "topic"
  | "responsible";

export type BroadcastScheduleRow = {
  id?: string;
  [key: string]: string | string[] | undefined;
};

type BroadcastFieldDefinition = {
  rowKey: BroadcastScheduleRowKey;
  fallbackLabel: string;
};

const BROADCAST_FIELD_DEFINITIONS: Record<BroadcastScheduleFieldKey, BroadcastFieldDefinition> = {
  broadcast_week: { rowKey: "week", fallbackLabel: "الأسبوع" },
  broadcast_day: { rowKey: "day", fallbackLabel: "اليوم" },
  broadcast_date: { rowKey: "date", fallbackLabel: "التاريخ" },
  broadcast_grade: { rowKey: "grade", fallbackLabel: "الصف" },
  broadcast_classroom: { rowKey: "classroom", fallbackLabel: "الفصل" },
  broadcast_topic: { rowKey: "topic", fallbackLabel: "الموضوع" },
  broadcast_responsible: { rowKey: "responsible", fallbackLabel: "المسؤول" },
};

const FALLBACK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const MAX_ROWS = 100;
const OTHER_VALUE = "__OTHER__";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function preserveText(value: unknown): string {
  return String(value ?? "");
}

function activeFields(
  fields?: RuntimeField[],
): Array<RuntimeField & { key: BroadcastScheduleFieldKey }> {
  return (fields ?? [])
    .filter(isBroadcastScheduleField)
    .sort((a, b) => a.order - b.order);
}

function createRow(fields: RuntimeField[] = []): BroadcastScheduleRow {
  const row: BroadcastScheduleRow = {
    id: `broadcast-row-${Date.now()}-${Math.random()}`,
  };

  for (const field of activeFields(fields)) {
    row[BROADCAST_FIELD_DEFINITIONS[field.key].rowKey] = "";
  }

  return row;
}

export function isBroadcastScheduleField(
  field?: RuntimeField | null,
): field is RuntimeField & { key: BroadcastScheduleFieldKey } {
  return Boolean(
    field &&
      (BROADCAST_SCHEDULE_FIELD_KEYS as readonly string[]).includes(field.key),
  );
}

export function isBroadcastScheduleStep(step?: { fields?: RuntimeField[] } | null): boolean {
  return activeFields(step?.fields).length > 0;
}

export function normalizeBroadcastScheduleRows(
  value: unknown,
  fields: RuntimeField[] = [],
): BroadcastScheduleRow[] {
  const parsed = parseBroadcastScheduleRows(value);
  const configuredFields = activeFields(fields);
  if (!parsed) return [createRow(configuredFields)];

  const rows = parsed
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .slice(0, MAX_ROWS)
    .map((row) => {
      const next: BroadcastScheduleRow = {
        id: clean(row.id) || createRow(configuredFields).id,
      };

      for (const field of configuredFields) {
        const rowKey = BROADCAST_FIELD_DEFINITIONS[field.key].rowKey;
        const rawValue = row[rowKey];
        next[rowKey] = Array.isArray(rawValue)
          ? rawValue.map(preserveText)
          : preserveText(rawValue);
      }

      return next;
    });

  return rows.length ? rows : [createRow(configuredFields)];
}

function valueHasText(value: unknown): boolean {
  return Array.isArray(value)
    ? value.some((item) => clean(item))
    : Boolean(clean(value));
}

export function isBroadcastScheduleRowEmpty(
  row: Partial<BroadcastScheduleRow>,
  fields: RuntimeField[] = [],
): boolean {
  const configuredFields = activeFields(fields);
  const keys = configuredFields.length
    ? configuredFields.map((field) => BROADCAST_FIELD_DEFINITIONS[field.key].rowKey)
    : Object.keys(row).filter((key) => key !== "id");

  return !keys.some((key) => valueHasText(row[key]));
}

export function getBroadcastScheduleMissingFields(
  row: Partial<BroadcastScheduleRow>,
  fields: RuntimeField[] = [],
): string[] {
  return activeFields(fields)
    .filter((field) => field.isRequired)
    .filter((field) => {
      const rowKey = BROADCAST_FIELD_DEFINITIONS[field.key].rowKey;
      return !valueHasText(row[rowKey]);
    })
    .map((field) => fieldLabel(field, field.key));
}

export function getBroadcastScheduleValidation(
  value: unknown,
  fields: RuntimeField[] = [],
): { valid: boolean; rowIndex?: number; missing?: string[] } {
  const parsed = parseBroadcastScheduleRows(value);
  if (!parsed) return { valid: true };

  for (let index = 0; index < parsed.length; index += 1) {
    const raw = parsed[index];
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Partial<BroadcastScheduleRow>;
    if (isBroadcastScheduleRowEmpty(row, fields)) continue;
    const missing = getBroadcastScheduleMissingFields(row, fields);
    if (missing.length) return { valid: false, rowIndex: index, missing };
  }

  return { valid: true };
}

function fieldLabel(field: RuntimeField | undefined, key: BroadcastScheduleFieldKey): string {
  return repairPotentialUtf8Mojibake(field?.label) || BROADCAST_FIELD_DEFINITIONS[key].fallbackLabel;
}

function fieldOptions(field: RuntimeField | undefined): RuntimeOption[] {
  return Array.isArray(field?.options) ? field.options : [];
}

function supportsOptions(field: RuntimeField | undefined): boolean {
  return Boolean(
    field &&
      ["SELECT", "RADIO", "DROPDOWN", "MULTI_SELECT", "CHECKBOX"].includes(field.type) &&
      fieldOptions(field).length,
  );
}

function isMultiSelect(field: RuntimeField | undefined): boolean {
  return field?.type === "MULTI_SELECT" || field?.type === "CHECKBOX";
}

function getRowString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join("، ") : value ?? "";
}

function getInputType(key: BroadcastScheduleFieldKey, field: RuntimeField | undefined): string {
  if (key === "broadcast_date" || field?.type === "DATE") return "date";
  if (field?.type === "NUMBER") return "number";
  return "text";
}

function OtherInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="اكتب القيمة"
      className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
    />
  );
}

function RowField({
  field,
  keyName,
  value,
  onChange,
}: {
  field: RuntimeField;
  keyName: BroadcastScheduleFieldKey;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  const [otherActive, setOtherActive] = useState(false);
  const label = fieldLabel(field, keyName);
  const options = fieldOptions(field);
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
  const multi = isMultiSelect(field);
  const configuredOptions = options.length
    ? options
    : keyName === "broadcast_day"
      ? FALLBACK_DAYS.map((day, index) => ({ id: day, value: day, label: day, order: index }))
      : [];
  const currentValues = Array.isArray(value) ? value : value ? [value] : [];
  const otherValues = currentValues.filter(
    (item) => !configuredOptions.some((option) => option.value === item),
  );
  const hasOther = Boolean(field.allowOther);
  const selectedOther = otherValues.length > 0;
  const select = keyName === "broadcast_week" || keyName === "broadcast_day" || supportsOptions(field);

  function setOtherValue(next: string) {
    setOtherActive(true);
    if (multi) {
      const known = currentValues.filter((item) => configuredOptions.some((option) => option.value === item));
      onChange([...known, next]);
    } else {
      onChange(next);
    }
  }

  if (multi) {
    const selected = currentValues;
    return (
      <label className="block space-y-1.5">
        <span className="text-xs font-black text-slate-600">{label}</span>
        <div className="space-y-2">
          {configuredOptions.map((option) => (
            <label key={option.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value);
                  onChange(next);
                }}
              />
              {repairPotentialUtf8Mojibake(option.label)}
            </label>
          ))}
          {hasOther ? (
            <label className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2 py-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={selectedOther}
                onChange={(event) => {
                  if (event.target.checked) onChange([...selected, ""]);
                  else onChange(selected.filter((item) => configuredOptions.some((option) => option.value === item)));
                }}
              />
              أخرى
            </label>
          ) : null}
          {hasOther && selectedOther ? (
            <OtherInput value={otherValues[0] ?? ""} onChange={setOtherValue} />
          ) : null}
        </div>
      </label>
    );
  }

  const selectValue = keyName === "broadcast_week"
    ? (typeof value === "string" ? value : "")
    : selectedOther || otherActive
      ? OTHER_VALUE
      : (typeof value === "string" ? value : "");

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black text-slate-600">{label}</span>
      {select ? (
        <>
          <select
            value={selectValue}
            onChange={(event) => {
              if (event.target.value === OTHER_VALUE) {
                setOtherActive(true);
                onChange(otherValues[0] ?? "");
              } else {
                setOtherActive(false);
                onChange(event.target.value);
              }
            }}
            className={inputClass}
          >
            <option value="">اختر...</option>
            {keyName === "broadcast_week"
              ? Array.from({ length: 20 }, (_, index) => String(index + 1)).map((week) => (
                  <option key={week} value={week}>الأسبوع {week}</option>
                ))
              : configuredOptions.map((option) => (
                  <option key={option.id} value={option.value}>{repairPotentialUtf8Mojibake(option.label)}</option>
                ))}
            {hasOther ? <option value={OTHER_VALUE}>أخرى</option> : null}
          </select>
          {hasOther && selectValue === OTHER_VALUE ? (
            <OtherInput value={otherValues[0] ?? ""} onChange={setOtherValue} />
          ) : null}
        </>
      ) : keyName === "broadcast_topic" && (field.type === "TEXTAREA" || field.type === "RICH_TEXT") ? (
        <textarea value={getRowString(value)} onChange={(event) => onChange(event.target.value)} rows={2} className={inputClass} />
      ) : (
        <input type={getInputType(keyName, field)} value={getRowString(value)} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
    </label>
  );
}

export function BroadcastScheduleRepeater({
  fields,
  value,
  onChange,
}: {
  fields: RuntimeField[];
  value: unknown;
  onChange: (rows: BroadcastScheduleRow[]) => void;
}) {
  const configuredFields = activeFields(fields);
  const rows = normalizeBroadcastScheduleRows(value, configuredFields);

  function updateRow(index: number, rowKey: BroadcastScheduleRowKey, nextValue: string | string[]) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [rowKey]: nextValue } : row));
  }

  function addRow() {
    if (rows.length < MAX_ROWS) onChange([...rows, createRow(configuredFields)]);
  }

  function deleteRow(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <section className="space-y-4 rounded-3xl border border-sky-100 bg-sky-50/50 p-4 md:p-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">خطة برنامج الإذاعة المدرسية</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">أضف الأسطر المطلوبة يدويًا، وكل سطر مستقل عن الآخر.</p>
        </div>
        <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-700">
          <Plus className="h-4 w-4" />
          إضافة سطر
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id || index} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-sky-700">السطر {index + 1}</span>
              <button type="button" onClick={() => deleteRow(index)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-black text-rose-600 transition hover:bg-rose-50" aria-label="حذف السطر" title="حذف السطر">
                <Trash2 className="h-4 w-4" />
                حذف
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {configuredFields.map((field) => {
                const definition = BROADCAST_FIELD_DEFINITIONS[field.key];
                return (
                  <RowField
                    key={field.id}
                    field={field}
                    keyName={field.key}
                    value={row[definition.rowKey]}
                    onChange={(nextValue) => updateRow(index, definition.rowKey, nextValue)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
