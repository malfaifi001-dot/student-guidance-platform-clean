"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReportTableBlock } from "@/lib/report-engine/document-draft/report-document-types";
import {
  addReportTableColumn,
  addReportTableRow,
  removeReportTableColumn,
  removeReportTableRow,
  updateReportTableCell,
  updateReportTableColumn,
} from "@/lib/report-engine/document-draft/report-table-utils";

type ReportTableEditorModalProps = {
  table: ReportTableBlock | null;
  open: boolean;
  onClose: () => void;
  onSave: (table: ReportTableBlock) => void;
};

export function ReportTableEditorModal({
  table,
  open,
  onClose,
  onSave,
}: ReportTableEditorModalProps) {
  const [draftTable, setDraftTable] = useState<ReportTableBlock | null>(table);

  useEffect(() => {
    setDraftTable(table ? JSON.parse(JSON.stringify(table)) : null);
  }, [table]);

  const filledCellsCount = useMemo(() => {
    if (!draftTable) return 0;

    return draftTable.rows.reduce((total, row) => {
      return (
        total +
        row.cells.filter((cell) => String(cell.value || "").trim().length > 0)
          .length
      );
    }, 0);
  }, [draftTable]);

  if (!open || !draftTable) return null;

  function updateTable(nextTable: ReportTableBlock) {
    setDraftTable(nextTable);
  }

  function updateSetting<K extends keyof ReportTableBlock["settings"]>(
    key: K,
    value: ReportTableBlock["settings"][K],
  ) {
    setDraftTable((currentTable) => {
      if (!currentTable) return currentTable;

      return {
        ...currentTable,
        settings: {
          ...currentTable.settings,
          [key]: value,
        },
      };
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      dir="rtl"
    >
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 to-white px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-950">تحرير الجدول</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              استخدم شريط التمرير الأفقي والسفلي عند كثرة الأعمدة أو الصفوف.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-slate-500 ring-1 ring-slate-100 transition hover:bg-rose-50 hover:text-rose-600"
            title="إغلاق"
          >
            ×
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-l border-slate-100 bg-slate-50/80 p-5">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black text-slate-600">
                  عنوان الجدول
                </label>
                <input
                  value={draftTable.title || ""}
                  onChange={(event) =>
                    updateTable({
                      ...draftTable,
                      title: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none transition focus:border-emerald-300"
                  placeholder="اكتب عنوان الجدول"
                />
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                <h3 className="text-sm font-black text-slate-900">
                  إعدادات التصميم
                </h3>

                <div className="mt-3 space-y-3">
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                    <span className="text-xs font-black text-slate-700">
                      تظليل أول صف
                    </span>
                    <input
                      type="checkbox"
                      checked={draftTable.settings.highlightHeaderRow}
                      onChange={(event) =>
                        updateSetting("highlightHeaderRow", event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-700"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                    <span className="text-xs font-black text-slate-700">
                      تظليل أول عمود
                    </span>
                    <input
                      type="checkbox"
                      checked={draftTable.settings.highlightFirstColumn}
                      onChange={(event) =>
                        updateSetting("highlightFirstColumn", event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-700"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                    <span className="text-xs font-black text-slate-700">
                      زوايا منحنية
                    </span>
                    <input
                      type="checkbox"
                      checked={draftTable.settings.rounded}
                      onChange={(event) =>
                        updateSetting("rounded", event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-700"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                    <span className="text-xs font-black text-slate-700">
                      تكرار رأس الجدول
                    </span>
                    <input
                      type="checkbox"
                      checked={draftTable.settings.repeatHeaderOnPageBreak}
                      onChange={(event) =>
                        updateSetting(
                          "repeatHeaderOnPageBreak",
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4 accent-emerald-700"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                    <span className="text-xs font-black text-slate-700">
                      جدول مضغوط
                    </span>
                    <input
                      type="checkbox"
                      checked={draftTable.settings.compact}
                      onChange={(event) =>
                        updateSetting("compact", event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-700"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => updateTable(addReportTableRow(draftTable))}
                  className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                >
                  + إضافة صف
                </button>

                <button
                  type="button"
                  onClick={() => updateTable(addReportTableColumn(draftTable))}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-100 transition hover:bg-emerald-50"
                >
                  + إضافة عمود
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-black text-slate-900">
                  ملخص الجدول
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-lg font-black text-slate-950">
                      {draftTable.columns.length}
                    </div>
                    <div className="mt-1 text-[10px] font-black text-slate-500">
                      أعمدة
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-lg font-black text-slate-950">
                      {draftTable.rows.length}
                    </div>
                    <div className="mt-1 text-[10px] font-black text-slate-500">
                      صفوف
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-lg font-black text-slate-950">
                      {filledCellsCount}
                    </div>
                    <div className="mt-1 text-[10px] font-black text-slate-500">
                      خلايا
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  محتوى الجدول
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  مساحة الجدول قابلة للتمرير أفقيًا ورأسيًا عند زيادة الأعمدة والصفوف.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-200"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={() => onSave(draftTable)}
                  className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800"
                >
                  حفظ الجدول
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-5">
              <div className="h-full overflow-auto rounded-[1.5rem] border border-slate-100 bg-slate-50 p-3 [scrollbar-color:#64748b_#e2e8f0] [scrollbar-width:thin]">
                <div
                  className={[
                    "w-max min-w-[900px] overflow-hidden border border-emerald-100 bg-white shadow-sm",
                    draftTable.settings.rounded ? "rounded-[1.5rem]" : "rounded-none",
                  ].join(" ")}
                >
                  <div className="bg-emerald-700 px-4 py-3 text-sm font-black text-white">
                    {draftTable.title || "جدول"}
                  </div>

                  <table dir="rtl" className="border-collapse text-right">
                    <thead>
                      <tr>
                        {draftTable.columns.map((column) => (
                          <th
                            key={column.id}
                            className={[
                              "w-[210px] min-w-[210px] border-b border-emerald-100 px-3 text-right",
                              draftTable.settings.highlightHeaderRow
                                ? "bg-emerald-50"
                                : "bg-white",
                              draftTable.settings.compact ? "py-2" : "py-3",
                            ].join(" ")}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                value={column.title}
                                onChange={(event) =>
                                  updateTable(
                                    updateReportTableColumn(
                                      draftTable,
                                      column.id,
                                      event.target.value,
                                    ),
                                  )
                                }
                                className="min-w-0 flex-1 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-right text-xs font-black text-emerald-950 outline-none transition focus:border-emerald-300"
                                placeholder="عنوان العمود"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  updateTable(
                                    removeReportTableColumn(draftTable, column.id),
                                  )
                                }
                                disabled={draftTable.columns.length <= 1}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                                title="حذف العمود"
                              >
                                ×
                              </button>
                            </div>
                          </th>
                        ))}

                        <th className="sticky left-0 z-20 w-16 border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-900 shadow-[-8px_0_12px_rgba(15,23,42,0.04)]">
                          الصف
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {draftTable.rows.map((row, rowIndex) => (
                        <tr key={row.id}>
                          {draftTable.columns.map((column, columnIndex) => (
                            <td
                              key={column.id}
                              className={[
                                "border-b border-slate-100 px-3 align-top",
                                draftTable.settings.highlightFirstColumn &&
                                columnIndex === 0
                                  ? "bg-emerald-50/60"
                                  : "bg-white",
                                draftTable.settings.compact ? "py-2" : "py-3",
                              ].join(" ")}
                            >
                              <textarea
                                value={row.cells[columnIndex]?.value || ""}
                                onChange={(event) =>
                                  updateTable(
                                    updateReportTableCell(
                                      draftTable,
                                      row.id,
                                      column.id,
                                      event.target.value,
                                    ),
                                  )
                                }
                                rows={3}
                                className="min-h-[96px] w-full resize-y rounded-xl border border-slate-100 bg-white px-3 py-2 text-right text-xs font-bold leading-6 text-slate-800 outline-none transition focus:border-emerald-300"
                                placeholder="محتوى الخلية"
                              />
                            </td>
                          ))}

                          <td className="sticky left-0 z-10 border-b border-slate-100 bg-slate-50 px-3 py-3 text-center align-middle shadow-[-8px_0_12px_rgba(15,23,42,0.04)]">
                            <div className="flex flex-col items-center gap-2">
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-100">
                                {rowIndex + 1}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateTable(removeReportTableRow(draftTable, row.id))
                                }
                                disabled={draftTable.rows.length <= 1}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                                title="حذف الصف"
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}