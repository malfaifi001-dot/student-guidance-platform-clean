export function normalizePortfolioDuration(value: string, unit: string) {
  const rawValue = value.trim();
  const rawUnit = unit.trim();
  const numericValue = rawValue.match(/^([\d.,]+)(?:\s|$)/)?.[1] || rawValue;
  return { value: numericValue, unit: rawUnit };
}

export function formatPortfolioSourceDate(value: string) {
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
