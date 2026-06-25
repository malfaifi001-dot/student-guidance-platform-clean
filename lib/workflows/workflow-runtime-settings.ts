export const WORKFLOW_STUDENT_PICKER_MODES = [
  "SERVICE_DEFAULT",
  "REQUIRED",
  "DISABLED",
] as const;

export type WorkflowStudentPickerMode =
  (typeof WORKFLOW_STUDENT_PICKER_MODES)[number];

export const WORKFLOW_EVIDENCE_MODES = [
  "SERVICE_DEFAULT",
  "ENABLED",
  "DISABLED",
] as const;

export type WorkflowEvidenceMode = (typeof WORKFLOW_EVIDENCE_MODES)[number];

export function normalizeWorkflowStudentPickerMode(
  value: unknown,
): WorkflowStudentPickerMode {
  const text = String(value ?? "").trim().toUpperCase();

  if (text === "REQUIRED") {
    return "REQUIRED";
  }

  if (text === "DISABLED" || text === "NONE") {
    return "DISABLED";
  }

  return "SERVICE_DEFAULT";
}

export function normalizeWorkflowEvidenceMode(
  value: unknown,
): WorkflowEvidenceMode {
  const text = String(value ?? "").trim().toUpperCase();

  if (text === "ENABLED") {
    return "ENABLED";
  }

  if (text === "DISABLED" || text === "NONE") {
    return "DISABLED";
  }

  return "SERVICE_DEFAULT";
}
