const HIJRI_LOCALE = "ar-SA-u-ca-islamic-umalqura-nu-latn";

type HijriParts = {
  day: number;
  month: number;
  year: number;
};

function parseGregorianDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function getHijriParts(date: Date): HijriParts {
  const parts = new Intl.DateTimeFormat(HIJRI_LOCALE, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return { day: get("day"), month: get("month"), year: get("year") };
}

function formatTwoDigits(value: number) {
  return String(value).padStart(2, "0");
}

export function formatWorkflowHijriDate(value: unknown) {
  const raw = String(value ?? "").trim();
  const date = parseGregorianDateOnly(raw);
  if (!date) return raw;

  const { day, month, year } = getHijriParts(date);
  return `${formatTwoDigits(day)}/${formatTwoDigits(month)}/${year} هـ`;
}

function islamicToApproximateGregorian(hijri: HijriParts) {
  const julianDay =
    hijri.day +
    Math.ceil(29.5 * (hijri.month - 1)) +
    (hijri.year - 1) * 354 +
    Math.floor((3 + 11 * hijri.year) / 30) +
    1948439.5;
  const unixDays = Math.floor(julianDay - 2440587.5);
  return new Date(unixDays * 86400000);
}

function sameHijriDate(left: HijriParts, right: HijriParts) {
  return left.day === right.day && left.month === right.month && left.year === right.year;
}

function toCanonicalDate(date: Date) {
  return `${date.getUTCFullYear()}-${formatTwoDigits(date.getUTCMonth() + 1)}-${formatTwoDigits(date.getUTCDate())}`;
}

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

export function parseWorkflowHijriDateInput(value: string) {
  const normalized = normalizeDigits(value.trim()).replace(/\s*هـ\s*$/u, "");
  const match = /^(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{3,4})$/.exec(normalized);
  if (!match) return null;

  const target = {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };

  if (target.month < 1 || target.month > 12 || target.day < 1 || target.day > 30) {
    return null;
  }

  const approximate = islamicToApproximateGregorian(target);

  for (let offset = -5; offset <= 5; offset += 1) {
    const candidate = new Date(approximate.getTime() + offset * 86400000);
    if (sameHijriDate(getHijriParts(candidate), target)) {
      return toCanonicalDate(candidate);
    }
  }

  return null;
}
