import "server-only";

import type {
  StatisticsPrepareResult,
  StatisticsSelectedMetric,
  StatisticsValueSelection,
} from "./statistics-types";

const MAX_SELECTED_VALUES = 40;

export class StatisticsSelectionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(input: {
    message: string;
    code: string;
    status?: number;
  }) {
    super(input.message);
    this.name = "StatisticsSelectionError";
    this.code = input.code;
    this.status = input.status || 400;
  }
}

function asRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function cleanText(
  value: unknown,
  maxLength: number,
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function selectionKey(
  fieldKey: string,
  value: string,
) {
  return JSON.stringify([
    fieldKey,
    value,
  ]);
}

export function normalizeStatisticsSelections(
  value: unknown,
): StatisticsValueSelection[] {
  if (!Array.isArray(value)) {
    throw new StatisticsSelectionError({
      message: "اختر قيمة إحصائية واحدة على الأقل.",
      code: "STATISTICS_SELECTION_REQUIRED",
    });
  }

  if (value.length > MAX_SELECTED_VALUES) {
    throw new StatisticsSelectionError({
      message:
        `يمكن اختيار ${MAX_SELECTED_VALUES} قيمة كحد أقصى في التقرير الواحد.`,
      code: "STATISTICS_SELECTION_LIMIT_EXCEEDED",
    });
  }

  const normalized: StatisticsValueSelection[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const record = asRecord(item);

    if (!record) {
      throw new StatisticsSelectionError({
        message: "إحدى القيم المختارة غير صحيحة.",
        code: "INVALID_STATISTICS_SELECTION",
      });
    }

    const fieldKey = cleanText(
      record.fieldKey,
      191,
    );

    const selectedValue = cleanText(
      record.value,
      1000,
    );

    if (!fieldKey || !selectedValue) {
      throw new StatisticsSelectionError({
        message: "إحدى القيم المختارة غير مكتملة.",
        code: "INVALID_STATISTICS_SELECTION",
      });
    }

    const key = selectionKey(
      fieldKey,
      selectedValue,
    );

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    normalized.push({
      fieldKey,
      value: selectedValue,
    });
  }

  if (normalized.length === 0) {
    throw new StatisticsSelectionError({
      message: "اختر قيمة إحصائية واحدة على الأقل.",
      code: "STATISTICS_SELECTION_REQUIRED",
    });
  }

  return normalized;
}

export function selectPreparedStatisticsMetrics(
  prepared: StatisticsPrepareResult,
  selections: StatisticsValueSelection[],
): StatisticsSelectedMetric[] {
  const availableMetrics = new Map<
    string,
    StatisticsSelectedMetric
  >();

  for (const step of prepared.workflowSteps) {
    for (const field of step.fields) {
      for (const item of field.values) {
        availableMetrics.set(
          selectionKey(
            field.key,
            item.value,
          ),
          {
            metricId: item.metricId,

            fieldKey: field.key,
            fieldLabel: field.label,

            value: item.value,
            valueLabel: item.label,

            caseCount: item.caseCount,
          },
        );
      }
    }
  }

  const selectedMetrics: StatisticsSelectedMetric[] =
    [];

  for (const selection of selections) {
    const metric = availableMetrics.get(
      selectionKey(
        selection.fieldKey,
        selection.value,
      ),
    );

    if (!metric) {
      throw new StatisticsSelectionError({
        message:
          "إحدى القيم المختارة لم تعد متاحة ضمن البيانات الحالية.",
        code: "STATISTICS_SELECTION_NOT_AVAILABLE",
        status: 409,
      });
    }

    selectedMetrics.push(metric);
  }

  return selectedMetrics;
}