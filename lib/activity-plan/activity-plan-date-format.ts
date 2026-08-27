/** Presentation-only Hijri formatting for Activity Plan dates. */
export function formatActivityPlanHijriDate(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";

  const date =
    value instanceof Date
      ? value
      : new Date(`${String(value).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
