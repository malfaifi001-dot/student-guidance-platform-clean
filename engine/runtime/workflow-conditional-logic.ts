export type ConditionalValues = Record<string, unknown>;

type ConditionalOptionLike = {
  value: unknown;
  linkedToValue?: unknown;
};

type ConditionalFieldLike = {
  type?: unknown;
  dependsOnFieldKey?: unknown;
  linkedToValue?: unknown;
};

const FIELD_TYPE_ALIASES: Record<string, string> = {
  TEXT_AREA: "TEXTAREA",
  MULTISELECT: "MULTI_SELECT",
  MULTIPLE_SELECT: "MULTI_SELECT",
  DROPDOWN: "SELECT",
  FILE: "FILE_UPLOAD",
  IMAGE: "IMAGE_UPLOAD",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeWorkflowFieldType(value: unknown) {
  const normalized = clean(value)
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");

  return FIELD_TYPE_ALIASES[normalized] || normalized || "TEXT";
}

export function conditionalValueMatches(
  currentValue: unknown,
  linkedToValue: unknown,
) {
  const expected = clean(linkedToValue);
  if (!expected) return true;

  if (Array.isArray(currentValue)) {
    return currentValue.some((value) => clean(value) === expected);
  }

  return clean(currentValue) === expected;
}

export function isConditionalWorkflowFieldVisible(
  field: ConditionalFieldLike,
  values: ConditionalValues,
) {
  const parentKey = clean(field.dependsOnFieldKey);
  if (!parentKey) return true;

  const parentValue = values[parentKey];
  const hasParentValue = Array.isArray(parentValue)
    ? parentValue.some((value) => Boolean(clean(value)))
    : Boolean(clean(parentValue));
  if (!hasParentValue) return false;

  return conditionalValueMatches(parentValue, field.linkedToValue);
}

export function filterConditionalWorkflowOptions<T extends ConditionalOptionLike>(
  field: ConditionalFieldLike & { options?: Array<T> },
  values: ConditionalValues,
): T[] {
  const options = Array.isArray(field.options) ? field.options : [];
  const parentKey = clean(field.dependsOnFieldKey);
  if (!parentKey) return options;

  const parentValue = values[parentKey];
  return options.filter((option) =>
    conditionalValueMatches(parentValue, option.linkedToValue),
  );
}

export function conditionalOptionIdentity(option: ConditionalOptionLike) {
  return `${clean(option.value)}\u0000${clean(option.linkedToValue)}`;
}

export function normalizeConditionalWorkflow<T extends {
  steps: Array<{
    fields: Array<ConditionalFieldLike & { options: ConditionalOptionLike[] }>;
  }>;
}>(workflow: T): T {
  return {
    ...workflow,
    steps: workflow.steps.map((step) => ({
      ...step,
      fields: step.fields.map((field) => {
        const seen = new Set<string>();
        const options = field.options.filter((option) => {
          const identity = conditionalOptionIdentity(option);
          if (seen.has(identity)) return false;
          seen.add(identity);
          return true;
        });

        return {
          ...field,
          type: normalizeWorkflowFieldType(field.type),
          dependsOnFieldKey: clean(field.dependsOnFieldKey) || null,
          linkedToValue: clean(field.linkedToValue) || null,
          options: options.map((option) => ({
            ...option,
            linkedToValue: clean(option.linkedToValue) || null,
          })),
        };
      }),
    })),
  } as T;
}
