export type RuntimeValue = string | string[] | number | boolean | null | undefined;

export type RuntimeValues = Record<string, RuntimeValue>;

export type DependencyRule = {
  dependsOnFieldKey?: string | null;
  linkedToValue?: string | null;
};

export function isFieldVisible(rule: DependencyRule, values: RuntimeValues) {
  if (!rule.dependsOnFieldKey) return true;

  const parentValue = values[rule.dependsOnFieldKey];

  if (!rule.linkedToValue) {
    return parentValue !== undefined && parentValue !== null && parentValue !== "";
  }

  if (Array.isArray(parentValue)) {
    return parentValue.includes(rule.linkedToValue);
  }

  return String(parentValue ?? "") === rule.linkedToValue;
}