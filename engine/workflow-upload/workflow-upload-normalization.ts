import type { ParsedWorkflowRow } from "@/lib/workflow-upload/workflow-excel-parser";

type FieldDependencyRow = Pick<
  ParsedWorkflowRow,
  "fieldLinkedToValue" | "linkedToValue" | "optionLinkedToValue"
>;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export function getFieldLinkedToValue(fieldRows: FieldDependencyRow[]) {
  const first = fieldRows[0];

  if (!first) return null;

  const explicitFieldLinkedToValue = normalizeText(first.fieldLinkedToValue);

  if (explicitFieldLinkedToValue) {
    return explicitFieldLinkedToValue;
  }

  const legacyValues = Array.from(
    new Set(
      fieldRows.map((row) => normalizeText(row.linkedToValue)).filter(Boolean),
    ),
  );

  return legacyValues.length === 1 ? legacyValues[0] : null;
}
