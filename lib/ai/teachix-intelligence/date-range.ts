import "server-only";

export const TEACHIX_TIME_ZONE = "Asia/Riyadh";
export const PERIODS = ["today", "yesterday", "last7", "last30", "thisWeek", "previousWeek", "thisMonth", "previousMonth", "custom"] as const;
export type TeachixPeriod = (typeof PERIODS)[number];

export type NormalizedDateRange = {
  from: Date;
  to: Date;
  period: TeachixPeriod;
  label: string;
  days: number;
};

const DAY = 86400000;
const MAX_DAYS = 366;

function localDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TEACHIX_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as { year: number; month: number; day: number };
}

function localStart(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
}

function localDay(value: Date) {
  const parts = localDateParts(value);
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function parseDate(value: unknown, end: boolean) {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number);
    return localStart(year, month, day + (end ? 1 : 0));
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function range(from: Date, toExclusive: Date, period: TeachixPeriod, label: string): NormalizedDateRange {
  const days = Math.round((toExclusive.getTime() - from.getTime()) / DAY);
  if (days <= 0 || days > MAX_DAYS) throw new Error("DATE_RANGE_TOO_LARGE_OR_INVALID");
  return { from, to: new Date(toExclusive.getTime() - 1), period, label, days };
}

export function resolveTeachixDateRange(input: { period?: unknown; from?: unknown; to?: unknown; now?: Date }): NormalizedDateRange {
  const now = input.now || new Date();
  const today = localDay(now);
  const period = PERIODS.includes(input.period as TeachixPeriod) ? input.period as TeachixPeriod : input.from || input.to ? "custom" : "last7";
  if (period === "custom") {
    const from = parseDate(input.from, false);
    const to = parseDate(input.to, true);
    if (!from || !to) throw new Error("DATE_RANGE_REQUIRED");
    return range(from, to, period, "custom");
  }
  if (period === "today") return range(new Date(today), new Date(today + DAY), period, "today");
  if (period === "yesterday") return range(new Date(today - DAY), new Date(today), period, "yesterday");
  if (period === "last7") return range(new Date(today - 6 * DAY), new Date(today + DAY), period, "last7");
  if (period === "last30") return range(new Date(today - 29 * DAY), new Date(today + DAY), period, "last30");
  const dayOfWeek = new Date(today).getUTCDay();
  const monday = today - ((dayOfWeek + 6) % 7) * DAY;
  if (period === "thisWeek") return range(new Date(monday), new Date(monday + 7 * DAY), period, "thisWeek");
  if (period === "previousWeek") return range(new Date(monday - 7 * DAY), new Date(monday), period, "previousWeek");
  const current = new Date(today);
  const monthStart = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1);
  const nextMonth = Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1);
  if (period === "thisMonth") return range(new Date(monthStart), new Date(nextMonth), period, "thisMonth");
  const previousStart = Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1);
  return range(new Date(previousStart), new Date(monthStart), period, "previousMonth");
}

export function resolveComparisonRanges(input: { period?: unknown; currentFrom?: unknown; currentTo?: unknown; previousFrom?: unknown; previousTo?: unknown }) {
  const current = resolveTeachixDateRange({ period: input.period, from: input.currentFrom, to: input.currentTo });
  const previousFrom = parseDate(input.previousFrom, false);
  const previousTo = parseDate(input.previousTo, true);
  if (previousFrom && previousTo) {
    const previous = range(previousFrom, previousTo, "custom", "previous");
    if (previous.days !== current.days) throw new Error("COMPARISON_PERIODS_MUST_BE_EQUAL");
    return { current, previous };
  }
  const previous = range(new Date(current.from.getTime() - current.days * DAY), new Date(current.from.getTime()), "custom", "previous");
  return { current, previous };
}
