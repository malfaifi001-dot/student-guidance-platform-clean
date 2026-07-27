import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  StatisticsFieldDefinition,
  StatisticsFieldOption,
} from "./statistics-types";

export type StatisticsResolvedCase = {
  id: string;
  serviceSlug: string;
  workflowId: string | null;
  fields: Map<string, StatisticsFieldDefinition>;
  values: Map<string, string[]>;
};

export type StatisticsResolvedCases = {
  cases: StatisticsResolvedCase[];
};

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function nullableString(value: unknown) {
  const clean = cleanString(value);
  return clean || null;
}

function positiveNumber(
  value: unknown,
  fallback: number,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
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

function normalizeOptions(
  value: unknown,
): StatisticsFieldOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const record = asRecord(item);

      if (!record) {
        return null;
      }

      const optionValue =
        cleanString(record.value) ||
        cleanString(record.label);

      if (!optionValue) {
        return null;
      }

      return {
        value: optionValue,
        label:
          cleanString(record.label) ||
          optionValue,
        order: positiveNumber(
          record.order,
          index + 1,
        ),
        linkedToValue: nullableString(
          record.linkedToValue,
        ),
      };
    })
    .filter(
      (
        option,
      ): option is StatisticsFieldOption =>
        Boolean(option),
    )
    .sort(
      (first, second) =>
        first.order - second.order,
    );
}

function createFieldDefinition(input: {
  field: Record<string, unknown>;
  stepId: string;
  stepTitle: string;
  stepOrder: number;
  fieldIndex: number;
  workflowId: string | null;
}) {
  const key = cleanString(input.field.key);
  const type = cleanString(input.field.type);

  if (!key || !type) {
    return null;
  }

  const stepKey =
    `${input.stepOrder}:${input.stepTitle}`;

  return {
    id: `${key}::${type}`,
    key,
    label:
      cleanString(input.field.label) || key,
    type,
    workflowId: input.workflowId,

    stepId: input.stepId,
    stepKey,
    stepTitle: input.stepTitle,
    stepOrder: input.stepOrder,
    order: positiveNumber(
      input.field.order,
      input.fieldIndex + 1,
    ),

    dependsOnFieldKey: nullableString(
      input.field.dependsOnFieldKey,
    ),
    linkedToValue: nullableString(
      input.field.linkedToValue,
    ),

    options: normalizeOptions(
      input.field.options,
    ),
  } satisfies StatisticsFieldDefinition;
}

function normalizeWorkflowSteps(
  stepsValue: unknown,
  workflowId: string | null = null,
): StatisticsFieldDefinition[] {
  if (!Array.isArray(stepsValue)) {
    return [];
  }

  const definitions: StatisticsFieldDefinition[] =
    [];

  stepsValue.forEach((stepValue, stepIndex) => {
    const step = asRecord(stepValue);

    if (!step) {
      return;
    }

    const stepOrder = positiveNumber(
      step.order,
      stepIndex + 1,
    );

    const stepTitle =
      cleanString(step.title) ||
      `الخطوة ${stepOrder}`;

    const stepId =
      cleanString(step.id) ||
      `step:${stepOrder}:${stepTitle}`;

    const fields = Array.isArray(step.fields)
      ? step.fields
      : [];

    fields.forEach((fieldValue, fieldIndex) => {
      const field = asRecord(fieldValue);

      if (!field) {
        return;
      }

      const definition = createFieldDefinition({
        field,
        stepId,
        stepTitle,
        stepOrder,
        fieldIndex,
        workflowId,
      });

      if (definition) {
        definitions.push(definition);
      }
    });
  });

  return definitions.sort(
    (first, second) =>
      first.stepOrder - second.stepOrder ||
      first.order - second.order,
  );
}

function normalizeWorkflowSnapshot(
  snapshot: Prisma.JsonValue | null,
) {
  const record = asRecord(snapshot);

  if (!record) {
    return [];
  }

  return normalizeWorkflowSteps(record.steps, cleanString(record.id) || cleanString(record.workflowId) || null);
}

function normalizeScalarValues(
  input: unknown,
): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) =>
      normalizeScalarValues(item),
    );
  }

  if (
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
  ) {
    const clean = String(input).trim();
    return clean ? [clean] : [];
  }

  return [];
}

function parsePossibleJsonText(value: string) {
  const clean = value.trim();

  if (
    !clean.startsWith("[") ||
    !clean.endsWith("]")
  ) {
    return null;
  }

  try {
    return JSON.parse(clean) as unknown;
  } catch {
    return null;
  }
}

function normalizeChoiceValue(
  rawValue: string,
  field: StatisticsFieldDefinition,
) {
  const clean = rawValue.trim();

  if (!clean) {
    return "";
  }

  if (field.type === "CHECKBOX") {
    const normalized = clean.toLowerCase();

    if (
      ["true", "1", "yes", "on", "نعم"].includes(
        normalized,
      )
    ) {
      return "true";
    }

    if (
      ["false", "0", "no", "off", "لا"].includes(
        normalized,
      )
    ) {
      return "false";
    }
  }

  const matchedOption = field.options.find(
    (option) =>
      option.value === clean ||
      option.label === clean,
  );

  return matchedOption?.value || clean;
}

function splitMultiSelectText(
  value: string,
  field: StatisticsFieldDefinition,
) {
  if (field.type !== "MULTI_SELECT") {
    return [value];
  }

  const parts = value
    .split(/[,،]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return [value];
  }

  const allPartsAreKnownOptions = parts.every(
    (part) =>
      field.options.some(
        (option) =>
          option.value === part ||
          option.label === part,
      ),
  );

  return allPartsAreKnownOptions
    ? parts
    : [value];
}

function normalizeStoredCaseValue(input: {
  value: string | null;
  jsonValue: Prisma.JsonValue | null;
  field: StatisticsFieldDefinition;
}) {
  let rawValues = normalizeScalarValues(
    input.jsonValue,
  );

  if (
    rawValues.length === 0 &&
    input.value
  ) {
    const parsedJson = parsePossibleJsonText(
      input.value,
    );

    rawValues = parsedJson
      ? normalizeScalarValues(parsedJson)
      : splitMultiSelectText(
          input.value,
          input.field,
        );
  }

  return Array.from(
    new Set(
      rawValues
        .map((value) =>
          normalizeChoiceValue(
            value,
            input.field,
          ),
        )
        .filter(Boolean),
    ),
  );
}

export async function loadResolvedStatisticsCases(input: {
  caseIds: string[];
  serviceId: string;
  serviceSlug: string;
}): Promise<StatisticsResolvedCases> {
  if (input.caseIds.length === 0) {
    return {
      cases: [],
    };
  }

  const [caseEntries, activeWorkflow] =
    await Promise.all([
      prisma.caseEntry.findMany({
        where: {
          id: {
            in: input.caseIds,
          },
          serviceId: input.serviceId,
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          workflowId: true,
          workflowSnapshot: true,

          workflow: {
            select: {
              steps: {
                orderBy: {
                  order: "asc",
                },
                select: {
                  id: true,
                  title: true,
                  order: true,
                  fields: {
                    orderBy: {
                      order: "asc",
                    },
                    select: {
                      id: true,
                      key: true,
                      label: true,
                      type: true,
                      order: true,
                      dependsOnFieldKey: true,
                      linkedToValue: true,
                      options: {
                        orderBy: {
                          order: "asc",
                        },
                        select: {
                          value: true,
                          label: true,
                          order: true,
                          linkedToValue: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },

          values: {
            select: {
              fieldKey: true,
              value: true,
              jsonValue: true,

              field: {
                select: {
                  id: true,
                  key: true,
                  label: true,
                  type: true,
                  order: true,
                  dependsOnFieldKey: true,
                  linkedToValue: true,

                  step: {
                    select: {
                      id: true,
                      title: true,
                      order: true,
                    },
                  },

                  options: {
                    orderBy: {
                      order: "asc",
                    },
                    select: {
                      value: true,
                      label: true,
                      order: true,
                      linkedToValue: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      prisma.workflow.findFirst({
        where: {
          serviceId: input.serviceId,
          status: "ACTIVE",
          isActive: true,
        },
        orderBy: [
          {
            version: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
        select: {
          id: true,
          steps: {
            orderBy: {
              order: "asc",
            },
            select: {
              id: true,
              title: true,
              order: true,
              fields: {
                orderBy: {
                  order: "asc",
                },
                select: {
                  id: true,
                  key: true,
                  label: true,
                  type: true,
                  order: true,
                  dependsOnFieldKey: true,
                  linkedToValue: true,
                  options: {
                    orderBy: {
                      order: "asc",
                    },
                    select: {
                      value: true,
                      label: true,
                      order: true,
                      linkedToValue: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

  const activeDefinitions =
    normalizeWorkflowSteps(
      activeWorkflow?.steps || [],
      activeWorkflow?.id || null,
    );

  const resolvedCases: StatisticsResolvedCase[] =
    [];

  for (const caseEntry of caseEntries) {
    const snapshotDefinitions =
      normalizeWorkflowSnapshot(
        caseEntry.workflowSnapshot,
      );

    const relationDefinitions =
      normalizeWorkflowSteps(
        caseEntry.workflow?.steps || [],
        caseEntry.workflowId,
      );

    const primaryDefinitions =
      snapshotDefinitions.length > 0
        ? snapshotDefinitions
        : relationDefinitions.length > 0
          ? relationDefinitions
          : activeDefinitions;

    const fields = new Map<
      string,
      StatisticsFieldDefinition
    >();

    for (const definition of primaryDefinitions) {
      fields.set(definition.key, definition);
    }

    for (const caseValue of caseEntry.values) {
      if (
        !caseValue.field ||
        fields.has(caseValue.fieldKey)
      ) {
        continue;
      }

      const storedField = createFieldDefinition({
        field: {
          key:
            caseValue.field.key ||
            caseValue.fieldKey,
          label: caseValue.field.label,
          type: caseValue.field.type,
          order: caseValue.field.order,
          dependsOnFieldKey:
            caseValue.field.dependsOnFieldKey,
          linkedToValue:
            caseValue.field.linkedToValue,
          options: caseValue.field.options,
        },
        stepId: caseValue.field.step.id,
        stepTitle:
          caseValue.field.step.title,
        stepOrder:
          caseValue.field.step.order,
        fieldIndex: caseValue.field.order,
        workflowId: caseEntry.workflowId,
      });

      if (storedField) {
        fields.set(
          storedField.key,
          storedField,
        );
      }
    }

    const values = new Map<string, string[]>();

    for (const caseValue of caseEntry.values) {
      const field = fields.get(
        caseValue.fieldKey,
      );

      if (!field) {
        continue;
      }

      const normalizedValues =
        normalizeStoredCaseValue({
          value: caseValue.value,
          jsonValue: caseValue.jsonValue,
          field,
        });

      if (normalizedValues.length === 0) {
        continue;
      }

      const existing =
        values.get(caseValue.fieldKey) || [];

      values.set(
        caseValue.fieldKey,
        Array.from(
          new Set([
            ...existing,
            ...normalizedValues,
          ]),
        ),
      );
    }

    resolvedCases.push({
      id: caseEntry.id,
      serviceSlug: input.serviceSlug,
      workflowId: caseEntry.workflowId,
      fields,
      values,
    });
  }

  return {
    cases: resolvedCases,
  };
}
