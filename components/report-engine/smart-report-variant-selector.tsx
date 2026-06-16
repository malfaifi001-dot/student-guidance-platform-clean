import Link from "next/link";

import type {
  ReportVariantConfig,
  ReportVariantId,
} from "@/lib/report-engine/report-variant-registry";

type SmartReportVariantSelectorProps = {
  caseId: string;
  selectedVariantId: ReportVariantId;
  variants: ReportVariantConfig[];
};

export function SmartReportVariantSelector({
  caseId,
  selectedVariantId,
  variants,
}: SmartReportVariantSelectorProps) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
      <p className="px-2 text-xs font-black text-slate-500">
        شكل التقرير
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {variants.map((variant) => {
          const active = variant.id === selectedVariantId;

          return (
            <Link
              key={variant.id}
              href={`/dashboard/report-2/cases/${encodeURIComponent(caseId)}/prepare?variant=${variant.id}`}
              className={[
                "rounded-2xl px-4 py-3 text-xs font-black transition",
                active
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
              ].join(" ")}
              title={variant.description}
            >
              {variant.shortName}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
