export type WeekdayFieldLike = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
};

function normalizeArabicLabel(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

const WEEKDAY_KEYS = new Set([
  "day",
  "weekday",
  "week_day",
  "day_of_week",
  "execution_day",
  "activity_day",
  "broadcast_day",
  "meeting_day",
  "start_day",
  "end_day",
  "start_weekday",
  "end_weekday",
]);

const WEEKDAY_LABELS = new Set(
  [
  "اليوم",
  "يوم الأسبوع",
  "يوم التنفيذ",
  "يوم بداية التنفيذ",
  "يوم نهاية التنفيذ",
  "يوم البداية",
  "يوم النهاية",
  "اليوم الدراسي",
  "يوم الحضور",
  "يوم المتابعة",
  ].map(normalizeArabicLabel),
);

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Identifies an explicitly configured weekday field without treating every
 * label that happens to contain "اليوم" as a weekday field.
 */
export function isSeparateWeekdayField(field?: WeekdayFieldLike | null) {
  if (!field || String(field.type ?? "").toUpperCase() === "DATE") {
    return false;
  }

  const key = normalizeKey(field.key);
  const label = normalizeArabicLabel(field.label);

  if (WEEKDAY_KEYS.has(key) || WEEKDAY_LABELS.has(label)) {
    return true;
  }

  return /^(?:start|end|execution|activity|broadcast|meeting|school)?_?(?:day|weekday|week_day)$/.test(key);
}

export function hasSeparateWeekdayField(
  fields: WeekdayFieldLike[] | null | undefined,
  dateField?: WeekdayFieldLike | null,
) {
  if (!Array.isArray(fields)) return false;

  return fields.some((field) => {
    if (!field || field === dateField) return false;

    const sameField =
      Boolean(dateField?.key && field.key && dateField.key === field.key) ||
      Boolean(dateField?.label && field.label && dateField.label === field.label);

    return !sameField && isSeparateWeekdayField(field);
  });
}
