"use client";

import { Plus, Trash2 } from "lucide-react";

import type { RuntimeField, RuntimeOption } from "@/engine/runtime/runtime-resolver";
import { repairPotentialUtf8Mojibake } from "@/lib/text/repair-utf8-mojibake";

export const BROADCAST_SCHEDULE_VALUE_KEY = "broadcast_schedule_items";

export const BROADCAST_SCHEDULE_FIELD_KEYS = [
  "broadcast_week",
  "broadcast_day",
  "broadcast_date",
  "broadcast_grade",
  "broadcast_topic",
  "broadcast_responsible",
] as const;

export type BroadcastScheduleFieldKey = (typeof BROADCAST_SCHEDULE_FIELD_KEYS)[number];

export type BroadcastScheduleRow = {
  id?: string;
  week: string;
  day: string;
  date: string;
  grade: string;
  topic: string;
  responsible: string;
};

type BroadcastScheduleFieldMap = Record<BroadcastScheduleFieldKey, RuntimeField>;

const FALLBACK_LABELS: Record<BroadcastScheduleFieldKey, string> = {
  broadcast_week: "الأسبوع",
  broadcast_day: "اليوم",
  broadcast_date: "التاريخ",
  broadcast_grade: "الصف",
  broadcast_topic: "الموضوع",
  broadcast_responsible: "المسؤول",
};

const FALLBACK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const MAX_ROWS = 100;

function createRow(): BroadcastScheduleRow {
  return { id: `broadcast-row-${Date.now()}-${Math.random()}`, week: "", day: "", date: "", grade: "", topic: "", responsible: "" };
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function preserveText(value: unknown): string {
  return String(value ?? "");
}

function parseValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return [];

  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

export function isBroadcastScheduleField(field?: RuntimeField | null): field is RuntimeField & { key: BroadcastScheduleFieldKey } {
  return Boolean(field && (BROADCAST_SCHEDULE_FIELD_KEYS as readonly string[]).includes(field.key));
}

export function isBroadcastScheduleStep(step?: { fields?: RuntimeField[] } | null): boolean {
  if (!step) return false;
  const keys = new Set(step.fields?.map((field) => field.key) ?? []);
  return BROADCAST_SCHEDULE_FIELD_KEYS.every((key) => keys.has(key));
}

export function normalizeBroadcastScheduleRows(value: unknown): BroadcastScheduleRow[] {
  const parsed = parseValue(value);
  if (!Array.isArray(parsed)) return [createRow()];

  const rows = parsed
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .slice(0, MAX_ROWS)
    .map((row) => ({
      id: clean(row.id) || createRow().id,
      week: preserveText(row.week),
      day: preserveText(row.day),
      date: preserveText(row.date),
      grade: preserveText(row.grade),
      topic: preserveText(row.topic),
      responsible: preserveText(row.responsible),
    }));

  return rows.length ? rows : [createRow()];
}

export function isBroadcastScheduleRowEmpty(row: Partial<BroadcastScheduleRow>): boolean {
  return ![row.week, row.day, row.date, row.grade, row.topic, row.responsible].some((value) => clean(value));
}

export function getBroadcastScheduleMissingFields(row: Partial<BroadcastScheduleRow>): string[] {
  const missing: string[] = [];
  if (!clean(row.week)) missing.push("الأسبوع");
  if (!clean(row.day)) missing.push("اليوم");
  if (!clean(row.date)) missing.push("التاريخ");
  if (!clean(row.grade)) missing.push("الصف");
  if (!clean(row.topic)) missing.push("الموضوع");
  if (!clean(row.responsible)) missing.push("المسؤول");
  return missing;
}

export function getBroadcastScheduleValidation(value: unknown): { valid: boolean; rowIndex?: number; missing?: string[] } {
  const parsed = parseValue(value);
  if (!Array.isArray(parsed)) return { valid: true };

  for (let index = 0; index < parsed.length; index += 1) {
    const raw = parsed[index];
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Partial<BroadcastScheduleRow>;
    if (isBroadcastScheduleRowEmpty(row)) continue;
    const missing = getBroadcastScheduleMissingFields(row);
    if (missing.length) return { valid: false, rowIndex: index, missing };
  }

  return { valid: true };
}

function fieldLabel(field: RuntimeField | undefined, key: BroadcastScheduleFieldKey): string {
  return repairPotentialUtf8Mojibake(field?.label) || FALLBACK_LABELS[key];
}

function fieldOptions(field: RuntimeField | undefined): RuntimeOption[] {
  return Array.isArray(field?.options) ? field.options : [];
}

function usesSelect(field: RuntimeField | undefined): boolean {
  return Boolean(field && ["SELECT", "RADIO", "DROPDOWN"].includes(field.type) && fieldOptions(field).length);
}

function getInputType(key: BroadcastScheduleFieldKey, field: RuntimeField | undefined): string {
  if (key === "broadcast_date" || field?.type === "DATE") return "date";
  if (field?.type === "NUMBER") return "number";
  return "text";
}

function RowField({
  field,
  keyName,
  value,
  onChange,
}: {
  field?: RuntimeField;
  keyName: BroadcastScheduleFieldKey;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = fieldLabel(field, keyName);
  const options = fieldOptions(field);
  const select = keyName === "broadcast_week" || keyName === "broadcast_day" || usesSelect(field);
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black text-slate-600">{label}</span>
      {select ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
          <option value="">اختر...</option>
          {keyName === "broadcast_week"
            ? Array.from({ length: 20 }, (_, index) => String(index + 1)).map((week) => (
                <option key={week} value={week}>الأسبوع {week}</option>
              ))
            : (options.length ? options : FALLBACK_DAYS.map((day) => ({ id: day, value: day, label: day, order: 0 }))).map((option) => (
                <option key={option.id} value={option.value}>{repairPotentialUtf8Mojibake(option.label)}</option>
              ))}
        </select>
      ) : keyName === "broadcast_topic" && (field?.type === "TEXTAREA" || field?.type === "RICH_TEXT") ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={2} className={inputClass} />
      ) : (
        <input type={getInputType(keyName, field)} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
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
  const fieldMap = Object.fromEntries(
    BROADCAST_SCHEDULE_FIELD_KEYS.map((key) => [key, fields.find((field) => field.key === key)]),
  ) as Partial<BroadcastScheduleFieldMap>;
  const rows = normalizeBroadcastScheduleRows(value);

  function updateRow(index: number, key: keyof BroadcastScheduleRow, nextValue: string) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: nextValue } : row));
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    onChange([...rows, createRow()]);
  }

  function deleteRow(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  const rowFields: Array<[BroadcastScheduleFieldKey, keyof BroadcastScheduleRow]> = [
    ["broadcast_week", "week"],
    ["broadcast_day", "day"],
    ["broadcast_date", "date"],
    ["broadcast_grade", "grade"],
    ["broadcast_topic", "topic"],
    ["broadcast_responsible", "responsible"],
  ];

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
              {rowFields.map(([keyName, rowKey]) => (
                <RowField key={keyName} field={fieldMap[keyName]} keyName={keyName} value={row[rowKey] as string} onChange={(nextValue) => updateRow(index, rowKey, nextValue)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
