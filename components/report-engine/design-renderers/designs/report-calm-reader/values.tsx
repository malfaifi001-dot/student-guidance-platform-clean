import type { ReportValueGridProps } from "../report-design-component-types";

export function ReportCalmReaderValueGrid({ items }: ReportValueGridProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.key || item.label || index} className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
          <p className="text-[11px] font-black tracking-wide text-stone-500">{item.label}</p>
          <p className="mt-2 text-sm font-medium leading-8 text-stone-800">
            {String(item.value || "غير متوفر")}
          </p>
        </div>
      ))}
    </div>
  );
}
