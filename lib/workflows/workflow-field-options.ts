export const WORKFLOW_OPTION_FIELD_TYPES = [
  "SELECT",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
] as const;

export function supportsWorkflowFieldOptions(fieldType: string) {
  return (WORKFLOW_OPTION_FIELD_TYPES as readonly string[]).includes(fieldType);
}

export function createWorkflowOptionValue() {
  return `option_${crypto.randomUUID().replaceAll("-", "")}`;
}
