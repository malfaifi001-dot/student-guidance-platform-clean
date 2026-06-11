export const DEFAULT_REPORT_VARIANT_ID = "official-activity-card" as const;

export type ReportVariantId =
  | "official-activity-card"
  | "smart-general-a4";

export type ReportVariantConfig = {
  id: ReportVariantId;
  name: string;
  shortName: string;
  description: string;
  category: string;
  isDefault?: boolean;
};

export const reportVariants: ReportVariantConfig[] = [
  {
    id: "official-activity-card",
    name: "بطاقة نشاط رسمية",
    shortName: "بطاقة نشاط",
    description: "نموذج A4 رسمي مناسب لبرامج النشاط والشواهد والتوقيعات.",
    category: "رسمي",
    isDefault: true,
  },
  {
    id: "smart-general-a4",
    name: "تقرير عام A4",
    shortName: "تقرير عام",
    description: "نموذج عام للحالات والخدمات المختلفة مع عرض الحقول والشواهد.",
    category: "عام",
  },
];

export function isReportVariantId(value: unknown): value is ReportVariantId {
  return reportVariants.some((variant) => variant.id === value);
}

export function resolveReportVariantId(value: unknown): ReportVariantId {
  return isReportVariantId(value) ? value : DEFAULT_REPORT_VARIANT_ID;
}

export function getReportVariantById(value: unknown) {
  const id = resolveReportVariantId(value);

  return (
    reportVariants.find((variant) => variant.id === id) ||
    reportVariants[0]
  );
}