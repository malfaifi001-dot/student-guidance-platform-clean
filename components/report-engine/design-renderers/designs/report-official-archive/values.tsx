import type { ReportValueGridProps } from "../report-design-component-types";

export function ReportOfficialArchiveValueGrid({ items }: ReportValueGridProps) {
  return (
    <div className="overflow-hidden border border-slate-900 text-xs">
      {items.map((item, index) => (
        <div key={item.key || item.label || index} className="grid grid-cols-[42mm_1fr] border-b border-slate-300 last:border-b-0">
          <div className="border-l border-slate-900 bg-slate-100 px-3 py-3 font-black text-slate-900">
            {item.label}
          </div>
          <div className="px-3 py-3 font-bold leading-7 text-slate-800">
            {String(item.value || "غير متوفر")}
          </div>
        </div>
      ))}
    </div>
  );
}
