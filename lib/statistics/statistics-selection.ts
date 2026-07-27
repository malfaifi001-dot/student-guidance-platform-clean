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
  serviceSlug: string,
  workflowId: string | undefined,
  fieldKey: string,
  value: string,
) {
  return JSON.stringify([
    serviceSlug,
    workflowId || "legacy",
    fieldKey,
    value,
  ]);
}

export function normalizeStatisticsSelections(
  value: unknown,
  defaultServiceSlug?: string,
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

    const serviceSlug = (cleanText(record.serviceSlug, 191) || defaultServiceSlug || "").toLowerCase();
    const workflowId = cleanText(record.workflowId, 191) || undefined;

    if (!serviceSlug || !fieldKey || !selectedValue) {
      throw new StatisticsSelectionError({
        message: "إحدى القيم المختارة غير مكتملة.",
        code: "INVALID_STATISTICS_SELECTION",
      });
    }

    const key = selectionKey(
      serviceSlug,
      workflowId,
      fieldKey,
      selectedValue,
    );

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    normalized.push({
      serviceSlug,
      ...(workflowId ? { workflowId } : {}),
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
            field.serviceSlug,
            field.workflowId || undefined,
            field.key,
            item.value,
          ),
          {
            metricId: item.metricId,
            serviceSlug: field.serviceSlug,
            serviceName: field.serviceName,
            workflowId: field.workflowId,

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
    let metric = availableMetrics.get(
      selectionKey(
        selection.serviceSlug,
        selection.workflowId,
        selection.fieldKey,
        selection.value,
      ),
    );

    if (!metric && !selection.workflowId) {
      const compatible = Array.from(availableMetrics.values()).filter(
        (item) =>
          item.serviceSlug === selection.serviceSlug &&
          item.fieldKey === selection.fieldKey &&
          item.value === selection.value,
      );
      if (compatible.length === 1) metric = compatible[0];
    }

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
