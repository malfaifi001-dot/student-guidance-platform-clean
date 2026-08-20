import type { ReactNode } from "react";

export type PlanPricingCardData = {
  name: string;
  typeLabel: string;
  termLabel?: string | null;
  originalPrice: number;
  finalPrice?: number | null;
  promotionName?: string | null;
  durationLabel: string;
  audienceLabel: string;
  services: string[];
  allServices?: boolean;
  statusLabel?: string;
  footer?: ReactNode;
};

export function PlanPricingCard({ data }: { data: PlanPricingCardData }) {
  const hasPromotion =
    data.finalPrice != null &&
    data.finalPrice < data.originalPrice &&
    Boolean(data.promotionName);
  const serviceLabel = data.allServices
    ? "شامل جميع الخدمات"
    : data.services.length
      ? `يشمل ${data.services.length} خدمة`
      : "خدمات الباقة حسب الإعداد";
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-950">
            {data.name || "اسم الباقة"}
          </h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {data.typeLabel}
            {data.termLabel ? ` · ${data.termLabel}` : ""}
          </p>
        </div>
        {hasPromotion ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            {data.promotionName}
          </span>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        {hasPromotion ? (
          <span className="relative text-lg font-black text-slate-400">
            {data.originalPrice.toLocaleString("ar-SA")} ريال
            <span className="absolute inset-x-0 top-1/2 h-px bg-rose-400" />
          </span>
        ) : null}
        <strong className="text-4xl font-black text-slate-950">
          {(hasPromotion
            ? data.finalPrice
            : data.originalPrice
          )?.toLocaleString("ar-SA")}{" "}
          <span className="text-sm">ريال</span>
        </strong>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-bold text-slate-600">
        <span className="rounded-xl bg-slate-50 px-3 py-2">
          {data.durationLabel}
        </span>
        <span className="rounded-xl bg-slate-50 px-3 py-2">
          {data.audienceLabel}
        </span>
      </div>
      <p className="mt-4 text-sm font-black text-sky-700">{serviceLabel}</p>
      {data.footer ? <div className="mt-5">{data.footer}</div> : null}
    </article>
  );
}
