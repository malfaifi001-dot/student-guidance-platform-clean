export const DEFAULT_REPORT_VARIANT_ID = "official-activity-card" as const;

export type ReportVariantId =
  | "official-activity-card"
  | "smart-general-a4";

export type ReportVariantConfig = {
  id: ReportVariantId;
  name: string;
  shortName: string;
  description: string;
};

export const reportVariants: ReportVariantConfig[] = [
  {
    id: "official-activity-card",
    name: "بطاقة نشاط رسمية",
    shortName: "بطاقة نشاط",
    description: "تقرير رسمي لبرامج النشاط الطلابي بتصميم A4.",
  },
  {
    id: "smart-general-a4",
    name: "تقرير عام ذكي",
    shortName: "تقرير عام",
    description: "تقرير A4 عام يناسب الحالات والتقارير الخاصة.",
  },
];

export function resolveReportVariantId(
  value: string | null | undefined,
): ReportVariantId {
  if (value === "smart-general-a4") {
    return "smart-general-a4";
  }

  return DEFAULT_REPORT_VARIANT_ID;
}

export function getReportVariantById(
  id: ReportVariantId | string | null | undefined,
) {
  const resolvedId = resolveReportVariantId(id);

  return (
    reportVariants.find((variant) => variant.id === resolvedId) ||
    reportVariants.find((variant) => variant.id === DEFAULT_REPORT_VARIANT_ID) ||
    reportVariants[0]
  );
}