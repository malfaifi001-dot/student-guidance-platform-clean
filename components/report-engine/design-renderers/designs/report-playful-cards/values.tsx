import type { ReportValueGridProps } from "../report-design-component-types";

export function ReportPlayfulCardsValueGrid({ items }: ReportValueGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <div key={item.key || item.label || index} className="rounded-[28px] border border-orange-100 bg-gradient-to-l from-orange-50 to-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-sm font-black text-white">
              {index + 1}
            </span>
            <div>
              <p className="text-[11px] font-black text-orange-700">{item.label}</p>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-800">
                {String(item.value || "غير متوفر")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
