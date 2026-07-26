"use client";

import { useEffect, useRef } from "react";

type OptionLike = {
  id?: string;
  label: string;
  value: string;
  order: number;
  linkedToValue?: string | null;
};

type FieldLike = {
  key: string;
  label: string;
  allowOther?: boolean;
  dependsOnFieldKey?: string | null;
  linkedToValue?: string | null;
  options?: OptionLike[];
};

export type CommitteeChainRow = {
  id: string;
  agenda: string;
  agendaLabel?: string;
  agendaOther?: string;
  discussion: string;
  discussionLabel?: string;
  discussionOther?: string;
  recommendation: string;
  recommendationLabel?: string;
  recommendationOther?: string;
};

type Props = {
  fields: FieldLike[];
  values: Record<string, unknown>;
  value?: CommitteeChainRow[];
  onChange: (rows: CommitteeChainRow[]) => void;
};

const OTHER_VALUE = "__OTHER__";
const MAX_ROWS = 30;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_\s]+/g, " ")
    .trim();
}

function createId() {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `committee-row-${Date.now()}-${Math.random()}`;
}

function createRow(): CommitteeChainRow {
  return {
    id: createId(),
    agenda: "",
    agendaLabel: "",
    agendaOther: "",
    discussion: "",
    discussionLabel: "",
    discussionOther: "",
    recommendation: "",
    recommendationLabel: "",
    recommendationOther: "",
  };
}

function fieldText(field: FieldLike) {
  return normalizeText(`${field.key} ${field.label}`);
}

function findAgendaFields(fields: FieldLike[]) {
  return fields.filter((field) => {
    const text = fieldText(field);

    return (
      text.includes("agenda") ||
      text.includes("agenda item") ||
      text.includes("committee agenda") ||
      text.includes("جدول") ||
      text.includes("الاعمال") ||
      text.includes("الأعمال")
    );
  });
}

function findDiscussionField(fields: FieldLike[]) {
  return fields.find((field) => {
    const text = fieldText(field);

    return (
      text.includes("discussion") ||
      text.includes("discussion axis") ||
      text.includes("committee discussion") ||
      text.includes("محور") ||
      text.includes("نقاش")
    );
  });
}

function findRecommendationField(fields: FieldLike[]) {
  return fields.find((field) => {
    const text = fieldText(field);

    return (
      text.includes("recommendation") ||
      text.includes("committee recommendation") ||
      text.includes("توصية") ||
      text.includes("التوصية") ||
      text.includes("التوصيات")
    );
  });
}

function sortOptions(field?: FieldLike | null) {
  const options = Array.isArray(field?.options) ? field.options : [];

  return [...options].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0),
  );
}

function cleanValue(value: unknown) {
  return String(value ?? "").trim();
}

function sameValue(a: unknown, b: unknown) {
  const left = cleanValue(a);
  const right = cleanValue(b);

  return Boolean(left && right && left === right);
}

function isOther(value: unknown) {
  return cleanValue(value) === OTHER_VALUE;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function findOptionByValue(options: OptionLike[], value: string) {
  return options.find((option) => sameValue(option.value, value)) || null;
}

function findStrictChildOption(
  childOptions: OptionLike[],
  parentValue?: string | null,
) {
  const linkedOptions = childOptions.filter((option) =>
    sameValue(option.linkedToValue, parentValue),
  );

  return linkedOptions[0] || null;
}

function getStrictChildOptions(
  childOptions: OptionLike[],
  parentValue?: string | null,
) {
  const strictOption = findStrictChildOption(childOptions, parentValue);

  return strictOption ? [strictOption] : [];
}

function getParentValues(field: FieldLike, values: Record<string, unknown>) {
  if (!field.dependsOnFieldKey) return [];

  const value = values[field.dependsOnFieldKey];
  const source = Array.isArray(value) ? value : [value];

  return source.map(cleanValue).filter(Boolean);
}

function isFieldInCurrentScope(
  field: FieldLike,
  values: Record<string, unknown>,
) {
  if (!field.dependsOnFieldKey) return true;

  const parentValues = getParentValues(field, values);
  if (!parentValues.length) return false;

  return field.linkedToValue
    ? parentValues.some((value) => sameValue(value, field.linkedToValue))
    : true;
}

function getScopedOptions(
  field: FieldLike | undefined,
  values: Record<string, unknown>,
) {
  if (!field || !isFieldInCurrentScope(field, values)) return [];

  const options = sortOptions(field);
  if (!field.dependsOnFieldKey) return options;

  const parentValues = getParentValues(field, values);
  const fieldProvidesScope = Boolean(
    field.linkedToValue &&
      parentValues.some((value) => sameValue(value, field.linkedToValue)),
  );

  return options.filter((option) =>
    option.linkedToValue
      ? parentValues.some((value) => sameValue(value, option.linkedToValue))
      : fieldProvidesScope,
  );
}

function getCommitteeScopeSignature(
  agendaFields: FieldLike[],
  values: Record<string, unknown>,
) {
  const dependencyKeys = [
    ...new Set(
      agendaFields
        .map((field) => field.dependsOnFieldKey)
        .filter((key): key is string => Boolean(key)),
    ),
  ].sort();

  return JSON.stringify(
    dependencyKeys.map((key) => [key, values[key] ?? null]),
  );
}

function isRowUsed(row: Partial<CommitteeChainRow>) {
  return Boolean(
    row.agenda ||
      row.agendaOther ||
      row.discussion ||
      row.discussionOther ||
      row.recommendation ||
      row.recommendationOther,
  );
}

function isRowComplete(row: Partial<CommitteeChainRow>) {
  const agendaReady = isOther(row.agenda)
    ? hasText(row.agendaOther)
    : hasText(row.agenda);

  const discussionReady = isOther(row.discussion)
    ? hasText(row.discussionOther)
    : hasText(row.discussion);

  const recommendationReady = isOther(row.recommendation)
    ? hasText(row.recommendationOther)
    : hasText(row.recommendation);

  return agendaReady && discussionReady && recommendationReady;
}

export function isCommitteeRowsValid(value: unknown) {
  if (!Array.isArray(value)) return false;

  const usedRows = value.filter(
    (row) => row && typeof row === "object" && isRowUsed(row),
  );

  if (!usedRows.length) return false;

  return usedRows.every((row) => isRowComplete(row));
}

function normalizeRows(value?: CommitteeChainRow[]) {
  if (!Array.isArray(value) || !value.length) {
    return [createRow()];
  }

  const rows = value
    .filter(
      (row): row is CommitteeChainRow =>
        Boolean(row) && typeof row === "object",
    )
    .map((row) => ({
      ...createRow(),
      ...row,
      id: cleanValue(row.id) || createId(),
      agenda: cleanValue(row.agenda),
      discussion: cleanValue(row.discussion),
      recommendation: cleanValue(row.recommendation),
    }));

  return rows.length ? rows : [createRow()];
}

export function CommitteeChainRepeater({
  fields,
  values,
  value,
  onChange,
}: Props) {
  const agendaFields = findAgendaFields(fields);
  const agendaField = agendaFields.find((field) =>
    isFieldInCurrentScope(field, values),
  );
  const discussionField = findDiscussionField(fields);
  const recommendationField = findRecommendationField(fields);

  const agendaOptions = getScopedOptions(agendaField, values);
  const discussionOptions = sortOptions(discussionField);
  const recommendationOptions = sortOptions(recommendationField);
  const committeeScopeSignature = getCommitteeScopeSignature(
    agendaFields,
    values,
  );
  const previousCommitteeScopeRef = useRef(committeeScopeSignature);

  useEffect(() => {
    if (previousCommitteeScopeRef.current === committeeScopeSignature) return;

    previousCommitteeScopeRef.current = committeeScopeSignature;
    onChange([createRow()]);
  }, [committeeScopeSignature, onChange]);

  const rows = normalizeRows(value);

  function updateRows(nextRows: CommitteeChainRow[]) {
    onChange(nextRows.slice(0, MAX_ROWS));
  }

  function buildLinkedRow(row: CommitteeChainRow, agendaValue: string) {
    if (!agendaValue) {
      return {
        ...row,
        agenda: "",
        agendaLabel: "",
        agendaOther: "",
        discussion: "",
        discussionLabel: "",
        discussionOther: "",
        recommendation: "",
        recommendationLabel: "",
        recommendationOther: "",
      };
    }

    if (agendaValue === OTHER_VALUE) {
      return {
        ...row,
        agenda: OTHER_VALUE,
        agendaLabel: "أخرى",
        discussion: OTHER_VALUE,
        discussionLabel: "أخرى",
        recommendation: OTHER_VALUE,
        recommendationLabel: "أخرى",
      };
    }

    const selectedAgenda = findOptionByValue(agendaOptions, agendaValue);

    if (!selectedAgenda) {
      return {
        ...row,
        agenda: "",
        agendaLabel: "",
        discussion: "",
        discussionLabel: "",
        recommendation: "",
        recommendationLabel: "",
      };
    }

    const selectedDiscussion = findStrictChildOption(
      discussionOptions,
      selectedAgenda.value,
    );

    const selectedRecommendation =
      findStrictChildOption(
        recommendationOptions,
        selectedDiscussion?.value,
      ) ||
      findStrictChildOption(
        recommendationOptions,
        selectedAgenda.value,
      );

    return {
      ...row,
      agenda: selectedAgenda.value,
      agendaLabel: selectedAgenda.label,
      agendaOther: "",
      discussion: selectedDiscussion?.value || "",
      discussionLabel: selectedDiscussion?.label || "",
      discussionOther: "",
      recommendation: selectedRecommendation?.value || "",
      recommendationLabel: selectedRecommendation?.label || "",
      recommendationOther: "",
    };
  }

  function setAgenda(rowId: string, agendaValue: string) {
    updateRows(
      rows.map((row) =>
        row.id === rowId ? buildLinkedRow(row, agendaValue) : row,
      ),
    );
  }

  function setOtherValue(
    rowId: string,
    key: "agendaOther" | "discussionOther" | "recommendationOther",
    text: string,
  ) {
    updateRows(
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [key]: text,
            }
          : row,
      ),
    );
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) return;

    updateRows([...rows, createRow()]);
  }

  function removeRow(rowId: string) {
    const nextRows = rows.filter((row) => row.id !== rowId);

    updateRows(nextRows.length ? nextRows : [createRow()]);
  }

  return (
    <section className="rounded-[2rem] border border-sky-100 bg-sky-50/60 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-sky-700">
            اللجان والاجتماعات
          </p>

          <h3 className="mt-1 text-2xl font-black text-slate-900">
            جدول الأعمال ومحور النقاش والتوصية
          </h3>

          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
            اختر بند جدول الأعمال فقط، وسيتم ربط محور النقاش والتوصية المقابلة
            له تلقائيًا. لا يمكن اختيار محور أو توصية من صف مختلف.
          </p>
        </div>

        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_ROWS}
          className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + إضافة جدول أعمال
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const selectedAgenda = findOptionByValue(agendaOptions, row.agenda);

          const allowedDiscussionOptions = isOther(row.agenda)
            ? []
            : getStrictChildOptions(
                discussionOptions,
                selectedAgenda?.value,
              );

          const selectedDiscussion =
            allowedDiscussionOptions.find((option) =>
              sameValue(option.value, row.discussion),
            ) || allowedDiscussionOptions[0] || null;

          const allowedRecommendationOptions = isOther(row.agenda)
            ? []
            : getStrictChildOptions(
                recommendationOptions,
                selectedDiscussion?.value,
              ).length
              ? getStrictChildOptions(
                  recommendationOptions,
                  selectedDiscussion?.value,
                )
              : getStrictChildOptions(
                  recommendationOptions,
                  selectedAgenda?.value,
                );

          return (
            <article
              key={row.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <strong className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                  جدول {index + 1} - نقاش {index + 1} - توصية {index + 1}
                </strong>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-100"
                >
                  حذف
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    جدول الأعمال
                  </label>

                  <select
                    value={row.agenda || ""}
                    onChange={(event) => setAgenda(row.id, event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="">اختر جدول الأعمال...</option>

                    {agendaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.order}. {option.label}
                      </option>
                    ))}

                    {agendaField?.allowOther ? (
                      <option value={OTHER_VALUE}>أخرى</option>
                    ) : null}
                  </select>

                  {isOther(row.agenda) ? (
                    <input
                      value={row.agendaOther || ""}
                      onChange={(event) =>
                        setOtherValue(row.id, "agendaOther", event.target.value)
                      }
                      placeholder="اكتب بند جدول الأعمال..."
                      className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    />
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    محور النقاش
                  </label>

                  {isOther(row.agenda) ? (
                    <input
                      value={row.discussionOther || ""}
                      onChange={(event) =>
                        setOtherValue(
                          row.id,
                          "discussionOther",
                          event.target.value,
                        )
                      }
                      placeholder="اكتب محور النقاش..."
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    />
                  ) : (
                    <select
                      value={row.discussion || ""}
                      disabled
                      className="h-12 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none"
                    >
                      <option value="">
                        {row.agenda
                          ? "لا يوجد محور مرتبط بهذا البند"
                          : "اختر جدول الأعمال أولًا"}
                      </option>

                      {allowedDiscussionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.order}. {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {!isOther(row.agenda) && row.discussion ? (
                    <p className="mt-2 text-xs font-bold text-emerald-700">
                      تم ربط محور النقاش تلقائيًا بنفس صف جدول الأعمال.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    التوصية
                  </label>

                  {isOther(row.agenda) ? (
                    <input
                      value={row.recommendationOther || ""}
                      onChange={(event) =>
                        setOtherValue(
                          row.id,
                          "recommendationOther",
                          event.target.value,
                        )
                      }
                      placeholder="اكتب التوصية..."
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    />
                  ) : (
                    <select
                      value={row.recommendation || ""}
                      disabled
                      className="h-12 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none"
                    >
                      <option value="">
                        {row.discussion
                          ? "لا توجد توصية مرتبطة بهذا المحور"
                          : "اختر جدول الأعمال أولًا"}
                      </option>

                      {allowedRecommendationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.order}. {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {!isOther(row.agenda) && row.recommendation ? (
                    <p className="mt-2 text-xs font-bold text-emerald-700">
                      تم ربط التوصية تلقائيًا بنفس صف محور النقاش.
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
