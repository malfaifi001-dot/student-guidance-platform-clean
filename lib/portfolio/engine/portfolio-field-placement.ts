import type { PortfolioReportField } from "@/lib/portfolio/portfolio-report-content";

export type PortfolioFieldKind =
  | "short"
  | "medium"
  | "long"
  | "list";

export type PortfolioFieldInternalLayout = {
  valueColumns: 1 | 2 | 3;
  valuePlacement: "grid" | "list";
};

export type PortfolioFieldPlacement = {
  field: PortfolioReportField;

  /**
   * Backward-compatible field key.
   *
   * Batch 3 will introduce page-scoped measurement identities.
   */
  fieldKey: string;

  sourceIndex: number;

  columnStart: number;

  columnSpan: number;

  row: number;

  semanticKind: PortfolioFieldKind;

  measuredHeightPx?: number;

  renderedHeightPx?: number;

  stretchToBandHeight: boolean;

  internalLayout: PortfolioFieldInternalLayout;
};

export type PortfolioFieldBand = {
  id: string;

  columnCount: 1 | 2 | 3 | 4 | 5 | 6;

  items: PortfolioFieldPlacement[];

  heightPx?: number;
};

type PortfolioFieldMetrics = {
  labelCharacters: number;
  valueCharacters: number;
  longestValue: number;
  totalCharacters: number;
  valuesCount: number;
  isListValue: boolean;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function getValueItems(
  field: PortfolioReportField,
): string[] {
  if (Array.isArray(field.value)) {
    return field.value
      .map(normalizeText)
      .filter(Boolean);
  }

  const value = normalizeText(field.value);

  return value ? [value] : [];
}

export function getPortfolioFieldMetrics(
  field: PortfolioReportField,
): PortfolioFieldMetrics {
  const label = normalizeText(field.label);
  const values = getValueItems(field);
  const isListValue = Array.isArray(field.value);

  const valueCharacters = values.reduce(
    (sum, value) => sum + value.length,
    0,
  );

  const longestValue = values.reduce(
    (max, value) => Math.max(max, value.length),
    0,
  );

  return {
    labelCharacters: label.length,
    valueCharacters,
    longestValue,
    totalCharacters:
      label.length + valueCharacters,
    valuesCount: values.length,
    isListValue,
  };
}

export function classifyPortfolioField(
  field: PortfolioReportField,
): PortfolioFieldKind {
  const metrics = getPortfolioFieldMetrics(field);

  if (
    !metrics.isListValue &&
    metrics.valuesCount <= 1 &&
    metrics.labelCharacters <= 36 &&
    metrics.longestValue <= 36 &&
    metrics.totalCharacters <= 68
  ) {
    return "short";
  }

  if (
    !metrics.isListValue &&
    metrics.valuesCount <= 1 &&
    metrics.labelCharacters <= 48 &&
    metrics.longestValue <= 110 &&
    metrics.totalCharacters <= 150
  ) {
    return "medium";
  }

  if (
    metrics.isListValue &&
    metrics.valuesCount <= 3 &&
    metrics.longestValue <= 56 &&
    metrics.valueCharacters <= 125
  ) {
    return "medium";
  }

  if (metrics.valuesCount > 1) {
    return "list";
  }

  return "long";
}

/**
 * Decides how values INSIDE one field card are rendered.
 *
 * This is independent from the outer field grid.
 */
export function getPortfolioFieldInternalLayout(
  field: PortfolioReportField,
  outerColumnCount:
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6 = 4,
): PortfolioFieldInternalLayout {
  if (!Array.isArray(field.value)) {
    return {
      valueColumns: 1,
      valuePlacement: "list",
    };
  }

  const metrics = getPortfolioFieldMetrics(field);

  if (
    metrics.valuesCount < 4 ||
    metrics.valuesCount > 12
  ) {
    return {
      valueColumns: 1,
      valuePlacement: "list",
    };
  }

  const readableForGrid =
    metrics.longestValue <= 44 &&
    metrics.valueCharacters <= 320;

  if (!readableForGrid) {
    return {
      valueColumns: 1,
      valuePlacement: "list",
    };
  }

  /**
   * Three internal columns are reserved for genuinely short values.
   * Do not force them merely because the outer page has six columns.
   */
  const canUseThreeColumns =
    outerColumnCount >= 5 &&
    metrics.valuesCount >= 6 &&
    metrics.longestValue <= 22 &&
    metrics.valueCharacters <= 180;

  if (canUseThreeColumns) {
    return {
      valueColumns: 3,
      valuePlacement: "grid",
    };
  }

  return {
    valueColumns: 2,
    valuePlacement: "grid",
  };
}

/**
 * Outer grid span.
 *
 * Important:
 * short metadata must be allowed to occupy one column so a page can render
 * four or five compact cards in one row when the measured candidate allows it.
 */
export function getPortfolioFieldSpanForColumns(
  field: PortfolioReportField,
  columnCount: 1 | 2 | 3 | 4 | 5 | 6,
): number {
  const kind = classifyPortfolioField(field);
  const metrics = getPortfolioFieldMetrics(field);

  if (columnCount === 1) {
    return 1;
  }

  if (kind === "short") {
    return 1;
  }

  if (kind === "medium") {
    const compactScalar =
      !metrics.isListValue &&
      metrics.valuesCount <= 1 &&
      metrics.longestValue <= 52 &&
      metrics.totalCharacters <= 92;

    if (compactScalar) {
      return 1;
    }

    if (columnCount >= 4) {
      return 2;
    }

    return 1;
  }

  if (kind === "list") {
    const compactList =
      metrics.valuesCount >= 4 &&
      metrics.valuesCount <= 12 &&
      metrics.longestValue <= 44 &&
      metrics.valueCharacters <= 320;

    if (!compactList) {
      return columnCount;
    }

    if (columnCount === 2) {
      return 1;
    }

    if (columnCount === 3) {
      return 2;
    }

    if (columnCount === 4) {
      return 2;
    }

    if (columnCount === 5) {
      return metrics.longestValue <= 26
        ? 2
        : 3;
    }

    return 3;
  }

  return columnCount;
}

function getUsedColumns(
  row: PortfolioFieldPlacement[],
): number {
  return row.reduce(
    (sum, placement) =>
      sum + placement.columnSpan,
    0,
  );
}

function createPlacement(
  field: PortfolioReportField,
  sourceIndex: number,
  row: number,
  columnStart: number,
  columnSpan: number,
  columnCount: 1 | 2 | 3 | 4 | 5 | 6,
): PortfolioFieldPlacement {
  return {
    field,
    fieldKey: field.key,
    sourceIndex,
    columnStart,
    columnSpan,
    row,
    semanticKind:
      classifyPortfolioField(field),
    stretchToBandHeight: false,
    internalLayout:
      getPortfolioFieldInternalLayout(
        field,
        columnCount,
      ),
  };
}

/**
 * Deterministic row-band placement.
 *
 * Rules:
 * - source order remains the default
 * - bounded lookahead is max 3 fields
 * - compact fields may move forward only to fill a remaining row slot
 * - full-width fields are never jumped over
 * - no visual renderer is allowed to recalculate placement
 */
export function getAdaptivePortfolioFieldPlacements(
  fields: PortfolioReportField[],
  columnCount:
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6,
): PortfolioFieldPlacement[] {
  const rows: PortfolioFieldPlacement[][] = [];

  const pending = fields.map(
    (field, sourceIndex) => ({
      field,
      sourceIndex,
    }),
  );

  while (pending.length > 0) {
    if (!rows.length) {
      rows.push([]);
    }

    let currentRow = rows[rows.length - 1];
    let used = getUsedColumns(currentRow);

    if (used >= columnCount) {
      rows.push([]);
      currentRow = rows[rows.length - 1];
      used = 0;
    }

    const current = pending.shift()!;

    const currentSpan =
      getPortfolioFieldSpanForColumns(
        current.field,
        columnCount,
      );

    const remaining =
      columnCount - used;

    if (currentSpan <= remaining) {
      currentRow.push(
        createPlacement(
          current.field,
          current.sourceIndex,
          rows.length - 1,
          used + 1,
          currentSpan,
          columnCount,
        ),
      );

      continue;
    }

    /**
     * Try a small lookahead only when:
     * - the current row contains something
     * - some width remains
     * - current field itself cannot fit
     */
    if (
      currentRow.length > 0 &&
      remaining > 0
    ) {
      const maxLookahead = Math.min(
        3,
        pending.length,
      );

      let compatibleIndex = -1;

      for (
        let index = 0;
        index < maxLookahead;
        index += 1
      ) {
        const candidate =
          pending[index];

        const candidateSpan =
          getPortfolioFieldSpanForColumns(
            candidate.field,
            columnCount,
          );

        /**
         * Never pull a full-width field upward.
         */
        if (
          candidateSpan < columnCount &&
          candidateSpan <= remaining
        ) {
          compatibleIndex = index;
          break;
        }

        /**
         * A full-width field acts as a semantic barrier.
         */
        if (candidateSpan === columnCount) {
          break;
        }
      }

      if (compatibleIndex >= 0) {
        const compatible =
          pending.splice(
            compatibleIndex,
            1,
          )[0];

        const compatibleSpan =
          getPortfolioFieldSpanForColumns(
            compatible.field,
            columnCount,
          );

        currentRow.push(
          createPlacement(
            compatible.field,
            compatible.sourceIndex,
            rows.length - 1,
            used + 1,
            compatibleSpan,
            columnCount,
          ),
        );

        pending.unshift(current);

        continue;
      }
    }

    rows.push([
      createPlacement(
        current.field,
        current.sourceIndex,
        rows.length,
        1,
        currentSpan,
        columnCount,
      ),
    ]);
  }

  return rows.flat();
}

function isReasonableBandStretch(
  minHeight: number,
  maxHeight: number,
): boolean {
  if (
    minHeight <= 0 ||
    maxHeight <= 0
  ) {
    return false;
  }

  return maxHeight / minHeight <= 1.35;
}

/**
 * Converts placements to frozen row bands.
 *
 * Height stretching is allowed only when measured cards are reasonably
 * similar in height. No fake content is ever added.
 */
export function getPortfolioFieldBandPlan(
  fields: PortfolioReportField[],
  columnCount:
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6 = 4,
  measuredHeights?: Record<string, number>,
): PortfolioFieldBand[] {
  const placements =
    getAdaptivePortfolioFieldPlacements(
      fields,
      columnCount,
    ).map((placement) => {
      const measuredHeightPx =
        measuredHeights?.[
          placement.fieldKey
        ];

      return {
        ...placement,
        measuredHeightPx,
        renderedHeightPx:
          measuredHeightPx,
      };
    });

  const rowMap =
    new Map<
      number,
      PortfolioFieldPlacement[]
    >();

  for (const placement of placements) {
    const rowItems =
      rowMap.get(placement.row) ?? [];

    rowItems.push(placement);

    rowMap.set(
      placement.row,
      rowItems,
    );
  }

  return Array.from(
    rowMap.entries(),
  )
    .sort(
      ([firstRow], [secondRow]) =>
        firstRow - secondRow,
    )
    .map(([row, items]) => {
      const measured = items
        .map(
          (item) =>
            item.measuredHeightPx ?? 0,
        )
        .filter(
          (height) => height > 0,
        );

      const minHeight =
        measured.length
          ? Math.min(...measured)
          : 0;

      const maxHeight =
        measured.length
          ? Math.max(...measured)
          : 0;

      const canStretch =
        items.length > 1 &&
        isReasonableBandStretch(
          minHeight,
          maxHeight,
        );

      const bandHeight =
        canStretch && maxHeight > 0
          ? maxHeight
          : undefined;

      return {
        id: `portfolio-field-band-${row}`,
        columnCount,
        heightPx: bandHeight,

        items: items.map(
          (item) => ({
            ...item,

            stretchToBandHeight:
              canStretch,

            renderedHeightPx:
              canStretch
                ? bandHeight
                : item.measuredHeightPx,
          }),
        ),
      };
    });
}