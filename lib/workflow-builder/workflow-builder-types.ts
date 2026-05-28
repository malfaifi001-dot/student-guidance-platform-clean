export const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "RADIO",
  "FILE_UPLOAD",
  "IMAGE_UPLOAD",
  "RICH_TEXT",
] as const;

export type WorkflowFieldType = (typeof FIELD_TYPES)[number];