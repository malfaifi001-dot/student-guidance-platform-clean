import type { ReportValueItem } from "../designs/report-design-component-types";

export type ReportSmartFieldKind =
  | "short"
  | "medium"
  | "long"
  | "list";

export type ReportSmartFieldProfile =
  | "short-heavy"
  | "balanced"
  | "long-heavy";

function normalizeText(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getValueItems(item: ReportValueItem) {
  if (
    Array.isArray(item.valueItems) &&
    item.valueItems.length
  ) {
    return item.valueItems
      .map(normalizeText)
      .filter(Boolean);
  }

  if (Array.isArray(item.value)) {
    return item.value
      .map(normalizeText)
      .filter(Boolean);
  }

  const value = normalizeText(item.value);

  return value ? [value] : [];
}

export function getReportSmartFieldMetrics(
  item: ReportValueItem,
) {
  const label = normalizeText(item.label);
  const values = getValueItems(item);

  const valueCharacters = values.reduce(
    (sum, value) => sum + value.length,
    0,
  );

  const longestValue = values.reduce(
    (longest, value) =>
      Math.max(longest, value.length),
    0,
  );

  return {
    labelCharacters: label.length,
    valueCharacters,
    longestValue,
    totalCharacters:
      label.length + valueCharacters,
    valuesCount: values.length,
  };
}

export function classifyReportSmartField(
  item: ReportValueItem,
): ReportSmartFieldKind {
  const m =
    getReportSmartFieldMetrics(item);

  /*
   * SHORT
   * مناسب لربع صف تقريبًا.
   */
  if (
    m.valuesCount <= 1 &&
    m.longestValue <= 36 &&
    m.labelCharacters <= 36 &&
    m.totalCharacters <= 68
  ) {
    return "short";
  }

  /*
   * LIST
   * القائمة الصغيرة ليست Full Width تلقائيًا.
   * نسمح لها بنصف صف إذا كانت قصيرة.
   */
  if (
    m.valuesCount > 1 &&
    m.valuesCount <= 3 &&
    m.longestValue <= 52 &&
    m.valueCharacters <= 115
  ) {
    return "medium";
  }

  /*
   * MEDIUM
   * نصف صف، حتى لو احتاج سطرين أو ثلاثة.
   */
  if (
    m.valuesCount <= 1 &&
    m.longestValue <= 125 &&
    m.totalCharacters <= 165
  ) {
    return "medium";
  }

  /*
   * القائمة الأكبر فقط تعتبر list كاملة.
   */
  if (m.valuesCount > 1) {
    return "list";
  }

  return "long";
}

export function getReportSmartFieldProfile(
  items: ReportValueItem[],
): ReportSmartFieldProfile {
  if (!items.length) {
    return "balanced";
  }

  const counts = {
    short: 0,
    medium: 0,
    long: 0,
    list: 0,
  };

  for (const item of items) {
    counts[
      classifyReportSmartField(item)
    ] += 1;
  }

  const wideCount =
    counts.long + counts.list;

  if (
    wideCount >=
    Math.ceil(items.length * 0.55)
  ) {
    return "long-heavy";
  }

  if (
    counts.short + counts.medium >=
    Math.ceil(items.length * 0.7)
  ) {
    return "short-heavy";
  }

  return "balanced";
}