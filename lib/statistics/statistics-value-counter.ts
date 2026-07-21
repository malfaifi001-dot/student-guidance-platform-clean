import "server-only";

import type {
  StatisticsFieldDefinition,
  StatisticsFieldOption,
  StatisticsPreparedField,
  StatisticsPreparedWorkflowStep,
} from "./statistics-types";

import type {
  StatisticsResolvedCase,
  StatisticsResolvedCases,
} from "./statistics-workflow-resolver";

const SUPPORTED_FIELD_TYPES = new Set([
  "SELECT",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
]);

function normalizeExpectedParentValue(
  parentField: StatisticsFieldDefinition,
  expectedValue: string,
) {
  const clean = expectedValue.trim();

  const option = parentField.options.find(
    (item) =>
      item.value === clean ||
      item.label === clean,
  );

  return option?.value || clean;
}

function isDependencyPathValid(input: {
  caseEntry: StatisticsResolvedCase;
  fieldKey: string;
  selectedValue: string;
  visited?: Set<string>;
}): boolean {
  const field = input.caseEntry.fields.get(
    input.fieldKey,
  );

  if (!field) {
    return false;
  }

  if (!field.dependsOnFieldKey) {
    return true;
  }

  const visited = new Set(
    input.visited || [],
  );

  if (visited.has(field.key)) {
    return false;
  }

  visited.add(field.key);

  const parentField =
    input.caseEntry.fields.get(
      field.dependsOnFieldKey,
    );

  if (!parentField) {
    return false;
  }

  const parentValues =
    input.caseEntry.values.get(
      parentField.key,
    ) || [];

  if (parentValues.length === 0) {
    return false;
  }

  const validParentValues = parentValues.filter(
    (parentValue) =>
      isDependencyPathValid({
        caseEntry: input.caseEntry,
        fieldKey: parentField.key,
        selectedValue: parentValue,
        visited,
      }),
  );

  if (validParentValues.length === 0) {
    return false;
  }

  const selectedOption = field.options.find(
    (option) =>
      option.value === input.selectedValue ||
      option.label === input.selectedValue,
  );

  const expectedValues = [
    field.linkedToValue,
    selectedOption?.linkedToValue || null,
  ].filter(
    (value): value is string =>
      Boolean(value?.trim()),
  );

  if (expectedValues.length === 0) {
    return true;
  }

  return expectedValues.every(
    (expectedValue) => {
      const normalizedExpected =
        normalizeExpectedParentValue(
          parentField,
          expectedValue,
        );

      return validParentValues.includes(
        normalizedExpected,
      );
    },
  );
}

function getValueLabel(input: {
  field: StatisticsFieldDefinition;
  value: string;
  options: Map<string, StatisticsFieldOption>;
}) {
  const knownOption = input.options.get(
    input.value,
  );

  if (knownOption) {
    return knownOption.label;
  }

  if (
    input.field.type === "CHECKBOX" &&
    input.value === "true"
  ) {
    return "نعم";
  }

  if (
    input.field.type === "CHECKBOX" &&
    input.value === "false"
  ) {
    return "لا";
  }

  return input.value;
}

function metricId(
  fieldKey: string,
  value: string,
) {
  return [
    "field",
    encodeURIComponent(fieldKey),
    "value",
    encodeURIComponent(value),
  ].join(":");
}

type FieldCatalog = {
  definition: StatisticsFieldDefinition;
  options: Map<string, StatisticsFieldOption>;
};

function buildFieldCatalog(
  resolved: StatisticsResolvedCases,
) {
  const catalog = new Map<
    string,
    FieldCatalog
  >();

  for (const caseEntry of resolved.cases) {
    for (const field of caseEntry.fields.values()) {
      if (
        !SUPPORTED_FIELD_TYPES.has(field.type)
      ) {
        continue;
      }

      const catalogId = field.id;
      const current = catalog.get(catalogId);

      if (!current) {
        catalog.set(catalogId, {
          definition: field,
          options: new Map(
            field.options.map((option) => [
              option.value,
              option,
            ]),
          ),
        });

        continue;
      }

      for (const option of field.options) {
        if (!current.options.has(option.value)) {
          current.options.set(
            option.value,
            option,
          );
        }
      }
    }
  }

  return catalog;
}

function countField(input: {
  resolved: StatisticsResolvedCases;
  catalog: FieldCatalog;
}): StatisticsPreparedField | null {
  const field = input.catalog.definition;

  const caseIdsByValue = new Map<
    string,
    Set<string>
  >();

  const casesWithAnyValue = new Set<string>();

  for (const caseEntry of input.resolved.cases) {
    const caseField =
      caseEntry.fields.get(field.key);

    if (
      !caseField ||
      caseField.type !== field.type
    ) {
      continue;
    }

    const values =
      caseEntry.values.get(field.key) || [];

    const uniqueValidValues = new Set<string>();

    for (const value of values) {
      if (
        !isDependencyPathValid({
          caseEntry,
          fieldKey: field.key,
          selectedValue: value,
        })
      ) {
        continue;
      }

      uniqueValidValues.add(value);
    }

    if (uniqueValidValues.size > 0) {
      casesWithAnyValue.add(caseEntry.id);
    }

    for (const value of uniqueValidValues) {
      const caseIds =
        caseIdsByValue.get(value) ||
        new Set<string>();

      caseIds.add(caseEntry.id);
      caseIdsByValue.set(value, caseIds);
    }
  }

  const values = Array.from(
    caseIdsByValue.entries(),
  )
    .map(([value, caseIds]) => {
      const option =
        input.catalog.options.get(value);

      return {
        metricId: metricId(
          field.key,
          value,
        ),
        value,
        label: getValueLabel({
          field,
          value,
          options: input.catalog.options,
        }),
        caseCount: caseIds.size,
        optionOrder:
          option?.order ??
          Number.MAX_SAFE_INTEGER,
      };
    })
    .filter((item) => item.caseCount > 0)
    .sort(
      (first, second) =>
        first.optionOrder -
          second.optionOrder ||
        second.caseCount -
          first.caseCount ||
        first.label.localeCompare(
          second.label,
          "ar",
        ),
    )
    .map(
      ({
        optionOrder: _optionOrder,
        ...item
      }) => item,
    );

  if (values.length === 0) {
    return null;
  }

  return {
    id: field.id,
    key: field.key,
    label: field.label,
    type: field.type,

    stepKey: field.stepKey,
    stepTitle: field.stepTitle,
    stepOrder: field.stepOrder,
    order: field.order,

    dependsOnFieldKey:
      field.dependsOnFieldKey,

    caseCount: casesWithAnyValue.size,
    values,
  };
}

export function buildPreparedWorkflowSteps(
  resolved: StatisticsResolvedCases,
): StatisticsPreparedWorkflowStep[] {
  const catalog = buildFieldCatalog(resolved);

  const preparedFields = Array.from(
    catalog.values(),
  )
    .map((fieldCatalog) =>
      countField({
        resolved,
        catalog: fieldCatalog,
      }),
    )
    .filter(
      (
        field,
      ): field is StatisticsPreparedField =>
        Boolean(field),
    )
    .sort(
      (first, second) =>
        first.stepOrder -
          second.stepOrder ||
        first.order - second.order ||
        first.label.localeCompare(
          second.label,
          "ar",
        ),
    );

  const steps = new Map<
    string,
    StatisticsPreparedWorkflowStep
  >();

  for (const field of preparedFields) {
    const current = steps.get(
      field.stepKey,
    ) || {
      key: field.stepKey,
      title: field.stepTitle,
      order: field.stepOrder,
      fields: [],
    };

    current.fields.push(field);
    steps.set(field.stepKey, current);
  }

  return Array.from(steps.values()).sort(
    (first, second) =>
      first.order - second.order,
  );
}