"use client";

import { useState } from "react";
import { ReportOneEvidenceSettingsPanel } from "./report-one-evidence-settings-panel";
import type {
  ReportOneEditableBlock,
  ReportOneEditableField,
  ReportOneEvidenceSettings,
  ReportOneTemplateInfo,
} from "./report-one-editor-types";

type ReportOneControlPanelProps = {
  disabled?: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  template: ReportOneTemplateInfo | null;
  fields: ReportOneEditableField[];
  blocks: ReportOneEditableBlock[];
  activeBlockId: string;
  onFieldChange: (fieldId: string, patch: Partial<ReportOneEditableField>) => void;
  onToggleField: (fieldId: string) => void;
  onActiveBlockChange: (blockId: string) => void;
  onBlockChange: (block: ReportOneEditableBlock) => void;
  onAddBlock: (type: ReportOneEditableBlock["type"]) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
  evidenceSettings: ReportOneEvidenceSettings;
  onEvidenceSettingsChange: (settings: ReportOneEvidenceSettings) => void;
};

function getBlockTypeName(type: ReportOneEditableBlock["type"]) {
  if (type === "PARAGRAPH") return "فقرة";
  if (type === "BULLET_LIST") return "قائمة";
  if (type === "TABLE") return "جدول";
  if (type === "EVIDENCE") return "شواهد";

  return "بلوك";
}

function ensureTable(block: ReportOneEditableBlock) {
  const columns = block.columns?.length ? block.columns : ["المجال", "الإجراء", "ملاحظات"];
  const rows = block.rows?.length ? block.rows : [["", "", ""]];

  return {
    columns,
    rows: rows.map((row) => {
      const nextRow = [...row];

      while (nextRow.length < columns.length) {
        nextRow.push("");
      }

      return nextRow.slice(0, columns.length);
    }),
    settings:
      block.tableSettings || {
        highlightHeader: true,
        highlightFirstColumn: true,
        stripedRows: true,
        rounded: true,
        compact: false,
        repeatHeader: true,
      },
  };
}

export function ReportOneControlPanel({
  disabled = false,
  title,
  onTitleChange,
  template,
  fields,
  blocks,
  activeBlockId,
  onFieldChange,
  onToggleField,
  onActiveBlockChange,
  onBlockChange,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  evidenceSettings,
  onEvidenceSettingsChange,
}: ReportOneControlPanelProps) {
  const activeBlock = blocks.find((block) => block.id === activeBlockId) || blocks[0];
  const [openTableEditor, setOpenTableEditor] = useState(false);

  function updateActiveBlock(patch: Partial<ReportOneEditableBlock>) {
    if (!activeBlock) return;

    onBlockChange({
      ...activeBlock,
      ...patch,
    });
  }

  function updateTableCell(rowIndex: number, columnIndex: number, value: string) {
    if (!activeBlock || activeBlock.type !== "TABLE") return;

    const table = ensureTable(activeBlock);
    const rows = table.rows.map((row) => [...row]);

    rows[rowIndex][columnIndex] = value;

    onBlockChange({
      ...activeBlock,
      rows,
      columns: table.columns,
      tableSettings: table.settings,
    });
  }

  function updateTableColumn(columnIndex: number, value: string) {
    if (!activeBlock || activeBlock.type !== "TABLE") return;

    const table = ensureTable(activeBlock);
    const columns = table.columns.map((column, index) =>
      index === columnIndex ? value : column,
    );

    onBlockChange({
      ...activeBlock,
      columns,
      rows: table.rows,
      tableSettings: table.settings,
    });
  }

  function addTableRow() {
    if (!activeBlock || activeBlock.type !== "TABLE") return;

    const table = ensureTable(activeBlock);

    onBlockChange({
      ...activeBlock,
      columns: table.columns,
      rows: [...table.rows, table.columns.map(() => "")],
      tableSettings: table.settings,
    });
  }

  function addTableColumn() {
    if (!activeBlock || activeBlock.type !== "TABLE") return;

    const table = ensureTable(activeBlock);
    const nextColumnName = `عمود ${table.columns.length + 1}`;

    onBlockChange({
      ...activeBlock,
      columns: [...table.columns, nextColumnName],
      rows: table.rows.map((row) => [...row, ""]),
      tableSettings: table.settings,
    });
  }

  function removeTableRow(rowIndex: number) {
    if (!activeBlock || activeBlock.type !== "TABLE") return;

    const table = ensureTable(activeBlock);
    const rows = table.rows.filter((_, index) => index !== rowIndex);

    onBlockChange({
      ...activeBlock,
      rows: rows.length ? rows : [table.columns.map(() => "")],
      columns: table.columns,
      tableSettings: table.settings,
    });
  }

  function removeTableColumn(columnIndex: number) {
    if (!activeBlock || activeBlock.type !== "TABLE") return;

    const table = ensureTable(activeBlock);

    if (table.columns.length <= 1) return;

    const columns = table.columns.filter((_, index) => index !== columnIndex);
    const rows = table.rows.map((row) =>
      row.filter((_, index) => index !== columnIndex),
    );

    onBlockChange({
      ...activeBlock,
      columns,
      rows,
      tableSettings: table.settings,
    });
  }

  function updateTableSetting(key: keyof NonNullable<ReportOneEditableBlock["tableSettings"]>) {
    if (!activeBlock || activeBlock.type !== "TABLE") return;

    const table = ensureTable(activeBlock);

    onBlockChange({
      ...activeBlock,
      columns: table.columns,
      rows: table.rows,
      tableSettings: {
        ...table.settings,
        [key]: !table.settings[key],
      },
    });
  }

  const table = activeBlock?.type === "TABLE" ? ensureTable(activeBlock) : null;

  return (
    <aside className={disabled ? "space-y-4 opacity-70" : "space-y-4"}>
      <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-emerald-700">
          لوحة التحكم
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          {template?.name || "قالب التقرير"}
        </h2>

        <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
          تحكم بسيط للمعلم: عدّل، أضف، واحفظ بدون تعقيد.
        </p>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-950">
          1. عنوان التقرير
        </h3>

        <input
          value={title}
          disabled={disabled}
          onChange={(event) => {
            if (!disabled) onTitleChange(event.target.value);
          }}
          className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black outline-none focus:border-emerald-600"
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-950">
          2. الحقول المختارة
        </h3>

        <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
          ألغِ أي حقل لا تريده، أو عدّل الاسم والقيمة مباشرة.
        </p>

        <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
          {fields.map((field) => (
            <article
              key={field.id}
              className={[
                "rounded-2xl border p-3 transition",
                field.visible
                  ? "border-emerald-100 bg-emerald-50/40"
                  : "border-slate-100 bg-slate-50 opacity-70",
              ].join(" ")}
            >
              <label className="flex items-center gap-2 text-xs font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={field.visible}
                  disabled={disabled}
                  onChange={() => {
                    if (!disabled) onToggleField(field.id);
                  }}
                />
                عرض في التقرير
              </label>

              <input
                value={String(field.label || "")}
                disabled={disabled}
                onChange={(event) => {
                  if (!disabled) {
                    onFieldChange(field.id, {
                      label: event.target.value,
                    });
                  }
                }}
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-black outline-none focus:border-emerald-500"
                placeholder="اسم الحقل"
              />

              <textarea
                value={String(field.value || "")}
                disabled={disabled}
                onChange={(event) => {
                  if (!disabled) {
                    onFieldChange(field.id, {
                      value: event.target.value,
                    });
                  }
                }}
                rows={2}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs leading-6 outline-none focus:border-emerald-500"
                placeholder="القيمة"
              />
            </article>
          ))}
        </div>
      </section>

      <ReportOneEvidenceSettingsPanel
        disabled={disabled}
        settings={evidenceSettings}
        onChange={onEvidenceSettingsChange}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-950">
          4. البلوكات
        </h3>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onAddBlock("PARAGRAPH")}
            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"
          >
            + فقرة
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onAddBlock("BULLET_LIST")}
            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"
          >
            + قائمة
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onAddBlock("TABLE")}
            className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"
          >
            + جدول
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {blocks.map((block, index) => (
            <button
              key={block.id}
              type="button"
              onClick={() => onActiveBlockChange(block.id)}
              className={[
                "w-full rounded-2xl border p-3 text-right text-xs font-black transition",
                block.id === activeBlockId
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {index + 1}. {block.title} · {getBlockTypeName(block.type)}
            </button>
          ))}
        </div>
      </section>

      {activeBlock ? (
        <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-950">
              5. تعديل البلوك
            </h3>

            <div className="flex gap-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onMoveBlock(activeBlock.id, "up")}
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black"
              >
                ↑
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onMoveBlock(activeBlock.id, "down")}
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black"
              >
                ↓
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onRemoveBlock(activeBlock.id)}
                className="rounded-lg bg-red-50 px-2 py-1 text-xs font-black text-red-600"
              >
                حذف
              </button>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-black text-slate-500">
              العنوان
            </span>

            <input
              value={activeBlock.title}
              disabled={disabled}
              onChange={(event) => {
                if (!disabled) {
                  updateActiveBlock({
                    title: event.target.value,
                  });
                }
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black outline-none focus:border-emerald-600"
            />
          </label>

          {activeBlock.type === "TABLE" ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setOpenTableEditor(true)}
              className="mt-4 w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
            >
              تحرير الجدول
            </button>
          ) : (
            <label className="mt-4 block">
              <span className="text-xs font-black text-slate-500">
                المحتوى
              </span>

              <textarea
                value={activeBlock.body || ""}
                disabled={disabled}
                onChange={(event) => {
                  if (!disabled) {
                    updateActiveBlock({
                      body: event.target.value,
                    });
                  }
                }}
                rows={7}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-emerald-600"
              />
            </label>
          )}
        </section>
      ) : null}

      {openTableEditor && activeBlock?.type === "TABLE" && table ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-6">
          <section className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-sm font-black text-emerald-700">
                  تحرير الجدول
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {activeBlock.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setOpenTableEditor(false)}
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
              >
                إغلاق
              </button>
            </header>

            <div className="grid max-h-[76vh] gap-5 overflow-auto p-5 lg:grid-cols-[1fr_260px]">
              <div className="overflow-auto rounded-[1.5rem] border border-emerald-100 bg-emerald-50/30 p-4">
                <table className="w-full min-w-[720px] border-separate border-spacing-2 text-sm">
                  <thead>
                    <tr>
                      <th className="w-12 rounded-xl bg-slate-100 p-2 text-xs font-black text-slate-500">
                        #
                      </th>

                      {table.columns.map((column, columnIndex) => (
                        <th key={`${column}-${columnIndex}`} className="rounded-xl bg-emerald-700 p-2">
                          <div className="flex items-center gap-2">
                            <input
                              value={column}
                              onChange={(event) =>
                                updateTableColumn(columnIndex, event.target.value)
                              }
                              className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-center text-xs font-black text-slate-900 outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => removeTableColumn(columnIndex)}
                              className="rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-600"
                            >
                              ×
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="rounded-xl bg-white p-2 text-center text-xs font-black text-slate-400">
                          {rowIndex + 1}
                          <button
                            type="button"
                            onClick={() => removeTableRow(rowIndex)}
                            className="mt-2 block w-full rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-500"
                          >
                            حذف
                          </button>
                        </td>

                        {table.columns.map((column, columnIndex) => (
                          <td key={`${rowIndex}-${columnIndex}`} className="align-top">
                            <textarea
                              value={row[columnIndex] || ""}
                              onChange={(event) =>
                                updateTableCell(
                                  rowIndex,
                                  columnIndex,
                                  event.target.value,
                                )
                              }
                              rows={3}
                              placeholder="محتوى الخلية"
                              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <aside className={disabled ? "space-y-4 opacity-70" : "space-y-4"}>
                <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                  <h3 className="text-sm font-black text-slate-900">
                    إجراءات سريعة
                  </h3>

                  <button
                    type="button"
                    onClick={addTableRow}
                    className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-xs font-black text-white"
                  >
                    + إضافة صف
                  </button>

                  <button
                    type="button"
                    onClick={addTableColumn}
                    className="mt-2 w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800"
                  >
                    + إضافة عمود
                  </button>
                </section>

                <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                  <h3 className="text-sm font-black text-slate-900">
                    إعدادات الجدول
                  </h3>

                  {[
                    ["highlightHeader", "تظليل رأس الجدول"],
                    ["highlightFirstColumn", "تظليل أول عمود"],
                    ["stripedRows", "روايح جانبية"],
                    ["rounded", "زوايا مستديرة"],
                    ["compact", "عرض مضغوط"],
                    ["repeatHeader", "تكرار رأس الجدول"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(
                          table.settings[
                            key as keyof typeof table.settings
                          ],
                        )}
                        onChange={() =>
                          updateTableSetting(
                            key as keyof typeof table.settings,
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </section>

                <button
                  type="button"
                  onClick={() => setOpenTableEditor(false)}
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
                >
                  حفظ الجدول
                </button>
              </aside>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}