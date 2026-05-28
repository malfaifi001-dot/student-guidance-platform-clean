"use client";

import { Plus, Trash2 } from "lucide-react";
import type { RuntimeField } from "@/engine/runtime/runtime-resolver";

type CommitteeRow = {
  id: string;
  agenda?: string;
  agendaOther?: string;
  discussion?: string;
  discussionOther?: string;
  recommendation?: string;
  recommendationOther?: string;
};

type CommitteeChainRepeaterProps = {
  fields: RuntimeField[];
  value: CommitteeRow[] | undefined;
  onChange: (rows: CommitteeRow[]) => void;
};

function textOf(field: RuntimeField) {
  return `${field.key} ${field.label}`.toLowerCase();
}

function findAgendaField(fields: RuntimeField[]) {
  return fields.find((field) => {
    const text = textOf(field);
    return (
      text.includes("agenda") ||
      text.includes("جدول الأعمال") ||
      text.includes("جدول الاعمال")
    );
  });
}

function findDiscussionField(fields: RuntimeField[]) {
  return fields.find((field) => {
    const text = textOf(field);
    return (
      text.includes("discussion") ||
      text.includes("محور") ||
      text.includes("محاور") ||
      text.includes("النقاش")
    );
  });
}

function findRecommendationField(fields: RuntimeField[]) {
  return fields.find((field) => {
    const text = textOf(field);
    return (
      text.includes("recommendation") ||
      text.includes("توصية") ||
      text.includes("التوصية") ||
      text.includes("التوصيات")
    );
  });
}

function getOptions(field?: RuntimeField, linkedToValue?: string) {
  if (!field) return [];

  if (!linkedToValue || linkedToValue === "__OTHER__") {
    return field.options;
  }

  return field.options.filter((option) => option.linkedToValue === linkedToValue);
}

function createEmptyRow(): CommitteeRow {
  return {
    id: crypto.randomUUID(),
    agenda: "",
    agendaOther: "",
    discussion: "",
    discussionOther: "",
    recommendation: "",
    recommendationOther: "",
  };
}

export function CommitteeChainRepeater({
  fields,
  value,
  onChange,
}: CommitteeChainRepeaterProps) {
  const agendaField = findAgendaField(fields);
  const discussionField = findDiscussionField(fields);
  const recommendationField = findRecommendationField(fields);

  const rows = value && value.length > 0 ? value : [createEmptyRow()];

  function commit(nextRows: CommitteeRow[]) {
    onChange(nextRows);
  }

  function updateRow(rowId: string, patch: Partial<CommitteeRow>) {
    commit(rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function addRow() {
    commit([...rows, createEmptyRow()]);
  }

  function removeRow(rowId: string) {
    const nextRows = rows.filter((row) => row.id !== rowId);
    commit(nextRows.length > 0 ? nextRows : [createEmptyRow()]);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-sky-700">
            اللجان والاجتماعات
          </p>

          <h3 className="mt-2 text-2xl font-black text-slate-900">
            جدول الأعمال ومحور النقاش والتوصية
          </h3>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            أضف أكثر من صف. كل صف مستقل: جدول أعمال 1 ← نقاش 1 ← توصية 1.
          </p>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          إضافة جدول أعمال
        </button>
      </div>

      <div className="space-y-5">
        {rows.map((row, index) => {
          const agendaOptions = getOptions(agendaField);
          const discussionOptions = getOptions(discussionField, row.agenda);
          const recommendationOptions = getOptions(
            recommendationField,
            row.discussion
          );

          return (
            <div
              key={row.id}
              className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-black text-slate-700">
                  جدول {index + 1} - نقاش {index + 1} - توصية {index + 1}
                </p>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800">
                    جدول الأعمال
                  </label>

                  <select
                    value={row.agenda ?? ""}
                    onChange={(event) =>
                      updateRow(row.id, {
                        agenda: event.target.value,
                        agendaOther: "",
                        discussion: "",
                        discussionOther: "",
                        recommendation: "",
                        recommendationOther: "",
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="">اختر جدول الأعمال...</option>

                    {agendaOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}

                    <option value="__OTHER__">أخرى</option>
                  </select>

                  {row.agenda === "__OTHER__" ? (
                    <input
                      value={row.agendaOther ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, {
                          agendaOther: event.target.value,
                        })
                      }
                      placeholder="اكتب جدول الأعمال..."
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800">
                    محور النقاش
                  </label>

                  <select
                    value={row.discussion ?? ""}
                    disabled={!row.agenda}
                    onChange={(event) =>
                      updateRow(row.id, {
                        discussion: event.target.value,
                        discussionOther: "",
                        recommendation: "",
                        recommendationOther: "",
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
                  >
                    <option value="">اختر محور النقاش...</option>

                    {discussionOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}

                    <option value="__OTHER__">أخرى</option>
                  </select>

                  {row.discussion === "__OTHER__" ? (
                    <input
                      value={row.discussionOther ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, {
                          discussionOther: event.target.value,
                        })
                      }
                      placeholder="اكتب محور النقاش..."
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800">
                    التوصية
                  </label>

                  <select
                    value={row.recommendation ?? ""}
                    disabled={!row.discussion}
                    onChange={(event) =>
                      updateRow(row.id, {
                        recommendation: event.target.value,
                        recommendationOther: "",
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
                  >
                    <option value="">اختر التوصية...</option>

                    {recommendationOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}

                    <option value="__OTHER__">أخرى</option>
                  </select>

                  {row.recommendation === "__OTHER__" ? (
                    <input
                      value={row.recommendationOther ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, {
                          recommendationOther: event.target.value,
                        })
                      }
                      placeholder="اكتب التوصية..."
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}