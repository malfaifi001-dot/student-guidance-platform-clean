const STRUCTURED_TYPES = new Set(["SELECT", "RADIO", "CHECKBOX", "MULTI_SELECT", "BOOLEAN"]);
const KEY_TERMS = [
  "date", "day", "week", "month", "year", "time", "start_date", "end_date",
  "start_day", "end_day", "start_week", "end_week", "execution_date", "created_at",
  "updated_at", "academic_year", "semester", "term",
];
const ARABIC_SCHEDULING_LABELS = [
  "التاريخ", "تاريخ البداية", "تاريخ النهاية", "تاريخ التنفيذ", "اليوم", "يوم البداية",
  "يوم النهاية", "الأسبوع", "أسبوع البداية", "أسبوع النهاية", "الشهر", "السنة",
  "العام الدراسي", "الفصل الدراسي", "الوقت", "الساعة",
];

function normalize(value: string) {
  return value.trim().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/[\u064b-\u065f\u0670]/g, "").replace(/[\s-]+/g, "_");
}

export function isImportantStatisticsField(field: { key: string; label: string; type: string; options?: unknown[] }) {
  if (!STRUCTURED_TYPES.has(field.type.toUpperCase())) return false;
  const key = normalize(field.key);
  const label = normalize(field.label).replace(/_/g, " ");
  if (KEY_TERMS.some((term) => key === term || key.startsWith(`${term}_`) || key.endsWith(`_${term}`) || key.includes(`_${term}_`))) return false;
  if (ARABIC_SCHEDULING_LABELS.some((term) => label.includes(normalize(term).replace(/_/g, " ")))) return false;
  return field.type.toUpperCase() === "BOOLEAN" || field.type.toUpperCase() === "CHECKBOX" || Boolean(field.options?.length);
}
