import type { PortfolioReportField } from "@/lib/portfolio/portfolio-report-content";

export type PortfolioFieldKind = "short" | "medium" | "long" | "list";

export type PortfolioFieldSpan = 1 | 2 | 3 | 4;

export type PortfolioFieldLayoutItem = {
  field: PortfolioReportField;
  kind: PortfolioFieldKind;
  span: PortfolioFieldSpan;
  index: number;
};

export type PortfolioFieldLayoutRow = PortfolioFieldLayoutItem[];

function normalizeText(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getValueItems(field: PortfolioReportField) {
  if (Array.isArray(field.value)) {
    return field.value.map(normalizeText).filter(Boolean);
  }

  const value = normalizeText(field.value);
  return value ? [value] : [];
}

function getPortfolioFieldMetrics(field: PortfolioReportField) {
  const label = normalizeText(field.label);
  const values = getValueItems(field);
  const valueCharacters = values.reduce((sum, value) => sum + value.length, 0);
  const longestValue = values.reduce(
    (longest, value) => Math.max(longest, value.length),
    0,
  );

  return {
    labelCharacters: label.length,
    valueCharacters,
    longestValue,
    totalCharacters: label.length + valueCharacters,
    valuesCount: values.length,
  };
}

/** Classifies from rendered content, rather than from field names. */
export function classifyPortfolioField(
  field: PortfolioReportField,
): PortfolioFieldKind {
  const metrics = getPortfolioFieldMetrics(field);

  if (
    metrics.valuesCount <= 1 &&
    metrics.longestValue <= 36 &&
    metrics.labelCharacters <= 36 &&
    metrics.totalCharacters <= 68
  ) {
    return "short";
  }

  if (
    metrics.valuesCount > 1 &&
    metrics.valuesCount <= 3 &&
    metrics.longestValue <= 52 &&
    metrics.valueCharacters <= 115
  ) {
    return "medium";
  }

  if (
    metrics.valuesCount <= 1 &&
    metrics.longestValue <= 125 &&
    metrics.totalCharacters <= 165
  ) {
    return "medium";
  }

  if (metrics.valuesCount > 1) return "list";
  return "long";
}

function getBaseSpan(kind: PortfolioFieldKind): PortfolioFieldSpan {
  if (kind === "short") return 1;
  if (kind === "medium") return 2;
  return 4;
}

/**
 * Balances sequential fields on a four-span logical grid. The returned rows
 * preserve source order while allowing compatible fields to share a row.
 */
export function getBalancedPortfolioFieldRows(
  fields: PortfolioReportField[],
): PortfolioFieldLayoutRow[] {
  const items = fields.map((field, index) => {
    const kind = classifyPortfolioField(field);
    return { field, kind, span: getBaseSpan(kind), index };
  });

  const rows: PortfolioFieldLayoutRow[] = [];
  let row: PortfolioFieldLayoutItem[] = [];
  let used = 0;

  const balanceRow = () => {
    let remaining = 4 - used;

    while (remaining > 0) {
      let candidate = -1;

      for (let index = 0; index < row.length; index += 1) {
        if (
          row[index].span >= 4 ||
          (candidate !== -1 && row[index].span > row[candidate].span)
        ) {
          continue;
        }

        // Prefer the later field on ties: [1, 1, 1] becomes [1, 1, 2].
        candidate = index;
      }

      if (candidate === -1) break;
      row[candidate] = {
        ...row[candidate],
        span: (row[candidate].span + 1) as PortfolioFieldSpan,
      };
      remaining -= 1;
    }

    if (row.length) rows.push(row);
    row = [];
    used = 0;
  };

  for (const item of items) {
    if (item.span === 4 || used + item.span > 4) {
      if (row.length) balanceRow();
      row = [item];
      used = item.span;
      if (item.span === 4) balanceRow();
      continue;
    }

    row.push(item);
    used += item.span;
    if (used === 4) balanceRow();
  }

  if (row.length) balanceRow();
  return rows;
}
