export type RuntimeValues = Record<string, unknown>;

type RuntimeField = {
  id: string;
  key: string;
  type: string;
  isRequired?: boolean;
  dependsOnFieldKey?: string | null;
  linkedToValue?: string | null;
};

function normalizeValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

export function shouldShowField(
  field: RuntimeField,
  values: RuntimeValues
) {
  if (!field.dependsOnFieldKey) {
    return true;
  }

  const parentValue = normalizeValue(
    values[field.dependsOnFieldKey]
  );

  if (
    parentValue === undefined ||
    parentValue === null ||
    parentValue === ""
  ) {
    return false;
  }

  if (!field.linkedToValue) {
    return true;
  }

  if (Array.isArray(parentValue)) {
    return parentValue.includes(field.linkedToValue);
  }

  return String(parentValue) === String(field.linkedToValue);
}

export function validateStepRequiredFields(params: {
  fields: RuntimeField[];
  values: RuntimeValues;
}) {
  const { fields, values } = params;

  const missingFields: string[] = [];

  fields.forEach((field) => {
    const visible = shouldShowField(field, values);

    if (!visible || !field.isRequired) {
      return;
    }

    const value = values[field.key];

    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      missingFields.push(field.key);
    }
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}