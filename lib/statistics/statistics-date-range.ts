import type {
  StatisticsDatePreset,
  StatisticsDateRange,
} from "./statistics-types";

export class StatisticsDateRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatisticsDateRangeError";
  }
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function parseCustomDate(
  value: unknown,
  boundary: "START" | "END",
) {
  const clean = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    throw new StatisticsDateRangeError(
      "صيغة التاريخ المخصص يجب أن تكون YYYY-MM-DD.",
    );
  }

  const [year, month, day] = clean
    .split("-")
    .map(Number);

  const parsed = new Date(
    year,
    month - 1,
    day,
    boundary === "END" ? 23 : 0,
    boundary === "END" ? 59 : 0,
    boundary === "END" ? 59 : 0,
    boundary === "END" ? 999 : 0,
  );

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new StatisticsDateRangeError(
      "التاريخ المخصص غير صحيح.",
    );
  }

  return parsed;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizePreset(
  value: unknown,
): StatisticsDatePreset {
  const clean = String(value || "LAST_30_DAYS")
    .trim()
    .toUpperCase();

  const allowed = new Set<StatisticsDatePreset>([
    "ALL_TIME",
    "LAST_30_DAYS",
    "CURRENT_MONTH",
    "CURRENT_YEAR",
    "CUSTOM",
  ]);

  if (!allowed.has(clean as StatisticsDatePreset)) {
    throw new StatisticsDateRangeError(
      "نطاق التاريخ المحدد غير مدعوم.",
    );
  }

  return clean as StatisticsDatePreset;
}

export function resolveStatisticsDateRange(input: {
  preset?: unknown;
  from?: unknown;
  to?: unknown;
  now?: Date;
}): StatisticsDateRange {
  const preset = normalizePreset(input.preset);
  const now = input.now || new Date();

  if (preset === "ALL_TIME") {
    return {
      preset,
      from: new Date(2000, 0, 1, 0, 0, 0, 0),
      to: endOfDay(now),
      label: "جميع الفترات",
    };
  }

  if (preset === "LAST_30_DAYS") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 29);

    return {
      preset,
      from,
      to: endOfDay(now),
      label: "آخر 30 يومًا",
    };
  }

  if (preset === "CURRENT_MONTH") {
    const from = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    return {
      preset,
      from,
      to: endOfDay(now),
      label: "الشهر الحالي",
    };
  }

  if (preset === "CURRENT_YEAR") {
    const from = new Date(
      now.getFullYear(),
      0,
      1,
      0,
      0,
      0,
      0,
    );

    return {
      preset,
      from,
      to: endOfDay(now),
      label: "العام الحالي",
    };
  }

  const from = parseCustomDate(input.from, "START");
  const to = parseCustomDate(input.to, "END");

  if (from.getTime() > to.getTime()) {
    throw new StatisticsDateRangeError(
      "تاريخ البداية يجب أن يسبق تاريخ النهاية.",
    );
  }

  return {
    preset,
    from,
    to,
    label: `من ${formatDate(from)} إلى ${formatDate(to)}`,
  };
}