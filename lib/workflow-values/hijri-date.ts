const HJ_LOCALE = "en-US-u-ca-islamic-umalqura";

function parts(value: Date) {
  const result = new Intl.DateTimeFormat(HJ_LOCALE, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(value);

  return Object.fromEntries(
    result
      .filter((part) => part.type === "day" || part.type === "month" || part.type === "year")
      .map((part) => [part.type, Number(part.value)]),
  ) as { day: number; month: number; year: number };
}

function utcDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
    ? date
    : null;
}

export type HijriDate = { day: number; month: number; year: number };

export function gregorianToHijri(value: string): HijriDate | null {
  const date = utcDate(value);
  return date ? parts(date) : null;
}

export function hijriToGregorian(value: HijriDate): string | null {
  // Hijri years are about 33 years shorter per century; this gives a close
  // Gregorian starting point before the exact Umm al-Qura lookup below.
  const estimate = Date.UTC(value.year + 579, value.month - 1, value.day);
  for (let offset = -370; offset <= 370; offset += 1) {
    const date = new Date(estimate + offset * 86400000);
    const current = parts(date);
    if (current.year === value.year && current.month === value.month && current.day === value.day) {
      return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1)
        .toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
    }
  }

  return null;
}

export function formatHijriDate(value: string) {
  const date = utcDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatHijriDateWithDay(value: string) {
  const date = utcDate(value);
  if (!date) return "";
  const hijri = formatHijriDate(value);
  const day = new Intl.DateTimeFormat("ar-SA", { weekday: "long" }).format(date);
  return hijri ? `${hijri} - ${day}` : "";
}

export function hijriMonthDays(year: number, month: number) {
  const start = hijriToGregorian({ year, month, day: 1 });
  const next = hijriToGregorian({ year: month === 12 ? year + 1 : year, month: month === 12 ? 1 : month + 1, day: 1 });
  if (!start || !next) return 30;
  return Math.round((Date.parse(`${next}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}
