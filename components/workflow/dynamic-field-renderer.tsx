"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { SpecialReportFieldAi } from "@/components/special-report/special-report-field-ai";
import { WorkflowFieldAiActions } from "@/components/workflow/workflow-field-ai-actions";
import { repairPotentialUtf8Mojibake } from "@/lib/text/repair-utf8-mojibake";
import type {
  RuntimeField,
  RuntimeOption,
  RuntimeWorkflow,
} from "@/engine/runtime/runtime-resolver";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";
import { filterConditionalWorkflowOptions } from "@/engine/runtime/workflow-conditional-logic";

type DynamicFieldRendererProps = {
  field: RuntimeField;
  value: unknown;
  values: RuntimeValues;
  onChange: (key: string, value: unknown) => void;
  canEditFieldLabel?: boolean;
  onUpdateFieldLabel?: (
    fieldId: string,
    fieldKey: string,
    label: string
  ) => Promise<void> | void;
  workflow: RuntimeWorkflow;
};

const baseInputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const cardClass =
  "space-y-2 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm";

function HelpText({ text }: { text?: string | null }) {
  const displayText = repairPotentialUtf8Mojibake(text);

  if (!displayText) return null;

  return <p className="mt-2 text-xs leading-6 text-slate-400">{displayText}</p>;
}

function getFilteredOptions(field: RuntimeField, values: RuntimeValues) {
  return filterConditionalWorkflowOptions(field, values);
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
          {repairPotentialUtf8Mojibake(option.label)}
        </option>
      ))}
      {allowOther ? <option value="__OTHER__">أخرى</option> : null}
    </>
  );
}

function normalizeRepeaterItems(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const text = String(value).trim();
    return text ? [text] : [];
  }

  return [];
}

function RepeaterEditorInput({
  field,
  value,
  onChange,
}: {
  field: RuntimeField;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  if (field.type === "TEXTAREA" || field.type === "RICH_TEXT") {
    return (
      <textarea
        value={value}
        placeholder={repairPotentialUtf8Mojibake(field.placeholder) ?? ""}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className={baseInputClass}
      />
    );
  }

  return (
    <input
      type={
        field.type === "NUMBER"
          ? "number"
          : field.type === "DATE"
            ? "date"
            : "text"
      }
      value={value}
      placeholder={repairPotentialUtf8Mojibake(field.placeholder) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      className={baseInputClass}
    />
  );
}

function FieldHeader({
  field,
  canEditFieldLabel = false,
  onUpdateFieldLabel,
}: {
  field: RuntimeField;
  canEditFieldLabel?: boolean;
  onUpdateFieldLabel?: (
    fieldId: string,
    fieldKey: string,
    label: string
  ) => Promise<void> | void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(
    repairPotentialUtf8Mojibake(field.label) || "",
  );
  const [savingLabel, setSavingLabel] = useState(false);
  const [labelError, setLabelError] = useState("");
  const displayLabel = repairPotentialUtf8Mojibake(field.label) || "";

  useEffect(() => {
    if (!editingLabel) {
      setLabelDraft(displayLabel);
      setLabelError("");
    }
  }, [displayLabel, editingLabel]);

  async function handleSaveLabel() {
    const nextLabel = labelDraft.trim();

    if (!nextLabel) {
      setLabelError("اكتب عنوانًا للحقل.");
      return;
    }

    if (!onUpdateFieldLabel) {
      setEditingLabel(false);
      return;
    }

    try {
      setSavingLabel(true);
      setLabelError("");
      await onUpdateFieldLabel(field.id, field.key, nextLabel);
      setEditingLabel(false);
    } catch (error) {
      setLabelError(
        error instanceof Error
          ? error.message
          : "تعذر تحديث عنوان الحقل."
      );
    } finally {
      setSavingLabel(false);
    }
  }

  return (
    <div className="mb-3">
      {editingLabel ? (
        <div className="flex items-center gap-2">
          <input
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />

          <button
            type="button"
            onClick={() => void handleSaveLabel()}
            disabled={savingLabel}
            className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            aria-label="حفظ عنوان الحقل"
            title="حفظ عنوان الحقل"
          >
            <Check className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingLabel(false);
              setLabelDraft(displayLabel);
              setLabelError("");
            }}
            disabled={savingLabel}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="إلغاء تعديل عنوان الحقل"
            title="إلغاء تعديل عنوان الحقل"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-800">
            {displayLabel}
            {field.isRequired ? (
              <span className="mr-1 text-rose-500">*</span>
            ) : null}
          </p>

          {canEditFieldLabel ? (
            <button
              type="button"
              onClick={() => setEditingLabel(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="تعديل عنوان الحقل"
              title="تعديل عنوان الحقل"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      )}

      {labelError ? (
        <p className="mt-2 text-xs font-bold text-rose-600">{labelError}</p>
      ) : null}
    </div>
  );
}

function RepeaterFieldCard({
  field,
  value,
  onChange,
  canEditFieldLabel,
  onUpdateFieldLabel,
}: {
  field: RuntimeField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  canEditFieldLabel?: boolean;
  onUpdateFieldLabel?: (
    fieldId: string,
    fieldKey: string,
    label: string
  ) => Promise<void> | void;
}) {
  const items = useMemo(() => normalizeRepeaterItems(value), [value]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [creatingNewItem, setCreatingNewItem] = useState(false);
  const [itemDraft, setItemDraft] = useState("");

  function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    [nextItems[index], nextItems[targetIndex]] = [
      nextItems[targetIndex],
      nextItems[index],
    ];

    onChange(field.key, nextItems);
  }

  function deleteItem(index: number) {
    onChange(
      field.key,
      items.filter((_, itemIndex) => itemIndex !== index)
    );

    if (editingIndex === index) {
      setEditingIndex(null);
      setItemDraft("");
    }
  }

  function startEditingItem(index: number) {
    setCreatingNewItem(false);
    setEditingIndex(index);
    setItemDraft(items[index] ?? "");
  }

  function startCreatingItem() {
    setEditingIndex(null);
    setCreatingNewItem(true);
    setItemDraft("");
  }

  function cancelItemEditing() {
    setEditingIndex(null);
    setCreatingNewItem(false);
    setItemDraft("");
  }

  function saveItem() {
    const cleanValue = itemDraft.trim();

    if (!cleanValue) {
      return;
    }

    if (creatingNewItem) {
      onChange(field.key, [...items, cleanValue]);
      cancelItemEditing();
      return;
    }

    if (editingIndex === null) {
      return;
    }

    const nextItems = [...items];
    nextItems[editingIndex] = cleanValue;
    onChange(field.key, nextItems);
    cancelItemEditing();
  }

  return (
    <div className={cardClass}>
      <FieldHeader
        field={field}
        canEditFieldLabel={canEditFieldLabel}
        onUpdateFieldLabel={onUpdateFieldLabel}
      />

      <div className="space-y-2">
        {items.map((item, index) => {
          const isEditing = editingIndex === index;

          return (
            <div
              key={`${field.id}-${index}-${item}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              {isEditing ? (
                <div className="flex items-start gap-2">
                  <div className="pt-3 text-sm font-black text-slate-500">
                    {index + 1}.
                  </div>

                  <div className="flex-1">
                    <RepeaterEditorInput
                      field={field}
                      value={itemDraft}
                      onChange={setItemDraft}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={saveItem}
                    disabled={!itemDraft.trim()}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                    aria-label="حفظ العنصر"
                    title="حفظ العنصر"
                  >
                    <Check className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={cancelItemEditing}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                    aria-label="إلغاء تعديل العنصر"
                    title="إلغاء تعديل العنصر"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="pt-1 text-sm font-black text-slate-500">
                    {index + 1}.
                  </div>

                  <p className="flex-1 text-sm font-semibold leading-7 text-slate-700">
                    {repairPotentialUtf8Mojibake(item)}
                  </p>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                      aria-label="نقل العنصر لأعلى"
                      title="نقل العنصر لأعلى"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                      aria-label="نقل العنصر لأسفل"
                      title="نقل العنصر لأسفل"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditingItem(index)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                      aria-label="تعديل العنصر"
                      title="تعديل العنصر"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteItem(index)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                      aria-label="حذف العنصر"
                      title="حذف العنصر"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {creatingNewItem ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-2">
              <div className="pt-3 text-sm font-black text-slate-500">
                {items.length + 1}.
              </div>

              <div className="flex-1">
                <RepeaterEditorInput
                  field={field}
                  value={itemDraft}
                  onChange={setItemDraft}
                />
              </div>

              <button
                type="button"
                onClick={saveItem}
                disabled={!itemDraft.trim()}
                className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                aria-label="إضافة العنصر"
                title="إضافة العنصر"
              >
                <Check className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={cancelItemEditing}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="إلغاء إضافة العنصر"
                title="إلغاء إضافة العنصر"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {!items.length && !creatingNewItem ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
            أضف عناصر متعددة لهذا الحقل.
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={startCreatingItem}
          disabled={creatingNewItem || editingIndex !== null}
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          aria-label="إضافة عنصر"
          title="إضافة عنصر"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <HelpText text={field.helpText} />
    </div>
  );
}

export function DynamicFieldRenderer({
  field,
  value,
  values,
  onChange,
  canEditFieldLabel = false,
  onUpdateFieldLabel,
  workflow,
}: DynamicFieldRendererProps) {
  const filteredOptions = getFilteredOptions(field, values);
  const shouldShowAi =
    (field.type === "TEXT" || field.type === "TEXTAREA" || field.type === "RICH_TEXT") && !field.isRepeater;

  if (field.isRepeater) {
    return (
      <RepeaterFieldCard
        field={field}
        value={value}
        onChange={onChange}
        canEditFieldLabel={canEditFieldLabel}
        onUpdateFieldLabel={onUpdateFieldLabel}
      />
    );
  }

  if (
    field.type === "TEXT" ||
    field.type === "NUMBER" ||
    field.type === "DATE"
  ) {
    return (
      <div className={cardClass}>
        <FieldHeader
          field={field}
          canEditFieldLabel={canEditFieldLabel}
          onUpdateFieldLabel={onUpdateFieldLabel}
        />

        <input
          type={
            field.type === "NUMBER"
              ? "number"
              : field.type === "DATE"
                ? "date"
                : "text"
          }
          value={String(value ?? "")}
          placeholder={repairPotentialUtf8Mojibake(field.placeholder) ?? ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          className={baseInputClass}
        />

        <HelpText text={field.helpText} />

        {shouldShowAi ? (
          <>
            <SpecialReportFieldAi field={field} value={value} onChange={onChange} />
            <WorkflowFieldAiActions field={field} workflow={workflow} values={values} value={value} onChange={onChange} />
          </>
        ) : null}
      </div>
    );
  }

  if (field.type === "TEXTAREA" || field.type === "RICH_TEXT") {
    return (
      <div className={cardClass}>
        <FieldHeader
          field={field}
          canEditFieldLabel={canEditFieldLabel}
          onUpdateFieldLabel={onUpdateFieldLabel}
        />

        <textarea
          value={String(value ?? "")}
          placeholder={repairPotentialUtf8Mojibake(field.placeholder) ?? ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          rows={5}
          className={baseInputClass}
        />

        <HelpText text={field.helpText} />

        {shouldShowAi ? (
          <>
            <SpecialReportFieldAi field={field} value={value} onChange={onChange} />
            <WorkflowFieldAiActions field={field} workflow={workflow} values={values} value={value} onChange={onChange} />
          </>
        ) : null}
      </div>
    );
  }

  if (field.type === "SELECT" || field.type === "RADIO") {
    return (
      <div className={cardClass}>
        <FieldHeader
          field={field}
          canEditFieldLabel={canEditFieldLabel}
          onUpdateFieldLabel={onUpdateFieldLabel}
        />

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
      <div className={cardClass}>
        <FieldHeader
          field={field}
          canEditFieldLabel={canEditFieldLabel}
          onUpdateFieldLabel={onUpdateFieldLabel}
        />

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

                {repairPotentialUtf8Mojibake(option.label)}
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
      <div className={cardClass}>
        <FieldHeader
          field={field}
          canEditFieldLabel={canEditFieldLabel}
          onUpdateFieldLabel={onUpdateFieldLabel}
        />

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
