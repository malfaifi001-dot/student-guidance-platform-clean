import type { PortfolioReportField } from "@/lib/portfolio/portfolio-report-content";

export type PortfolioFieldKind = "short" | "medium" | "long" | "list";

export type PortfolioFieldSpan = 1 | 2 | 3 | 4;

export type PortfolioFieldLayoutItem = {
  field: PortfolioReportField;
  kind: PortfolioFieldKind;
  semanticSpan: 1 | 2 | 4;
  effectiveSpan: 1 | 2 | 4;
  /** Backward-compatible alias consumed by existing renderers. */
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
  const isListValue = Array.isArray(field.value);
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
    isListValue,
  };
}

/** Classifies from rendered content, rather than from field names. */
export function classifyPortfolioField(
  field: PortfolioReportField,
): PortfolioFieldKind {
  const metrics = getPortfolioFieldMetrics(field);

  if (
    !metrics.isListValue &&
    metrics.valuesCount <= 1 &&
    metrics.longestValue <= 36 &&
    metrics.labelCharacters <= 36 &&
    metrics.totalCharacters <= 68
  ) {
    return "short";
  }

  if (
    metrics.isListValue &&
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

function getBaseSpan(kind: PortfolioFieldKind): 1 | 2 | 4 {
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
    const semanticSpan = getBaseSpan(kind);
    return { field, kind, semanticSpan, effectiveSpan: semanticSpan, span: semanticSpan, index };
  });

  const rows: PortfolioFieldLayoutRow[] = [];
  let row: PortfolioFieldLayoutItem[] = [];
  let used = 0;

  const balanceRow = () => {
    const total = row.reduce((sum, item) => sum + item.semanticSpan, 0);
    // Redistribute only unused columns. Semantic classification remains intact.
    if (row.length === 2 && total === 3) {
      row = row.map((item) => item.semanticSpan === 1 ? { ...item, effectiveSpan: 2 as const, span: 2 as const } : item);
    } else if (row.length === 2 && total === 2) {
      row = row.map((item) => ({ ...item, effectiveSpan: 2 as const, span: 2 as const }));
    } else if (row.length === 3 && total === 3) {
      const last = row.length - 1;
      row = row.map((item, index) => index === last ? { ...item, effectiveSpan: 2 as const, span: 2 as const } : item);
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
