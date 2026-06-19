"use client";

import type { ReportFlowPrepareField } from "@/lib/report-flow/report-flow-types";

type MobileReportStudioFieldEditorProps = {
  fields: ReportFlowPrepareField[];
  search: string;
  onSearchChange: (value: string) => void;
  onFieldChange: (
    fieldId: string,
    patch: Partial<Pick<ReportFlowPrepareField, "label" | "value" | "selected">>,
  ) => void;
};

function getFieldSearchText(field: ReportFlowPrepareField) {
  return `${field.label} ${field.value} ${field.key}`.toLowerCase();
}

export function MobileReportStudioFieldEditor({
  fields,
  search,
  onSearchChange,
  onFieldChange,
}: MobileReportStudioFieldEditorProps) {
  const query = search.trim().toLowerCase();
  const visibleFields = query
    ? fields.filter((field) => getFieldSearchText(field).includes(query))
    : fields;

  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="ابحث داخل الحقول"
        className="h-12 w-full rounded-[1.35rem] border border-sky-100 bg-sky-50/70 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white"
      />

      <div className="space-y-2.5">
        {visibleFields.map((field) => (
          <article
            key={field.id}
            className={[
              "rounded-[1.45rem] p-3 transition",
              field.selected
                ? "bg-white ring-1 ring-sky-100"
                : "bg-slate-50/90 ring-1 ring-slate-100",
            ].join(" ")}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={field.selected}
                  onChange={(event) =>
                    onFieldChange(field.id, { selected: event.target.checked })
                  }
                  className="h-4 w-4 accent-sky-600"
                />
                إظهار في التقرير
              </label>

              {field.technical ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-100">
                  تقني
                </span>
              ) : null}
            </div>

            <label className="text-[10px] font-black text-slate-400">
              اسم الحقل
            </label>
            <input
              value={field.label}
              onChange={(event) =>
                onFieldChange(field.id, { label: event.target.value })
              }
              className="mt-1 h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white"
            />

            <label className="mt-3 block text-[10px] font-black text-slate-400">
              القيمة المعروضة
            </label>
            <textarea
              value={field.value}
              onChange={(event) =>
                onFieldChange(field.id, { value: event.target.value })
              }
              rows={3}
              className="mt-1 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold leading-7 text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white"
            />
          </article>
        ))}

        {!visibleFields.length ? (
          <div className="rounded-[1.35rem] bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">
            لا توجد نتائج مطابقة للبحث الحالي.
          </div>
        ) : null}
      </div>
    </div>
  );
}
