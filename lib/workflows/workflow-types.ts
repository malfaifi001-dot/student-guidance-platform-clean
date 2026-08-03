import { normalizeWorkflowActivationType } from "@/lib/workflows/workflow-slot";

export const WORKFLOW_PLACEMENTS = {
  SERVICE_MAIN: "service-main",
  GUARDIAN_SUMMONS: "guardian-summons",
  CERTIFICATE: "certificate",
  LETTER: "letter",
  FORM: "form",
} as const;

export type WorkflowPlacement =
  (typeof WORKFLOW_PLACEMENTS)[keyof typeof WORKFLOW_PLACEMENTS];

export const WORKFLOW_TYPES = {
  DEFAULT: WORKFLOW_PLACEMENTS.SERVICE_MAIN,
  SERVICE_MAIN: WORKFLOW_PLACEMENTS.SERVICE_MAIN,
  GUARDIAN_SUMMONS: WORKFLOW_PLACEMENTS.GUARDIAN_SUMMONS,
  CERTIFICATE: WORKFLOW_PLACEMENTS.CERTIFICATE,
  LETTER: WORKFLOW_PLACEMENTS.LETTER,
  FORM: WORKFLOW_PLACEMENTS.FORM,
} as const;

export type WorkflowType = (typeof WORKFLOW_TYPES)[keyof typeof WORKFLOW_TYPES];

export function normalizeWorkflowType(value?: string | null): WorkflowType {
  if (!value || value === "default") {
    return WORKFLOW_TYPES.SERVICE_MAIN;
  }

  if (value === WORKFLOW_TYPES.GUARDIAN_SUMMONS) {
    return WORKFLOW_TYPES.GUARDIAN_SUMMONS;
  }

  if (value === WORKFLOW_TYPES.CERTIFICATE) {
    return WORKFLOW_TYPES.CERTIFICATE;
  }

  if (value === WORKFLOW_TYPES.LETTER) {
    return WORKFLOW_TYPES.LETTER;
  }

  if (value === WORKFLOW_TYPES.FORM) {
    return WORKFLOW_TYPES.FORM;
  }

  return WORKFLOW_TYPES.SERVICE_MAIN;
}

export function getWorkflowPlacementLabel(value?: string | null) {
  if (value === WORKFLOW_TYPES.GUARDIAN_SUMMONS) return "إشعار ولي الأمر";
  if (value === WORKFLOW_TYPES.CERTIFICATE) return "شهادة";
  if (value === WORKFLOW_TYPES.LETTER) return "خطاب";
  if (value === WORKFLOW_TYPES.FORM) return "نموذج";

  return "Workflow أساسي للخدمة";
}

export function isSecondaryWorkflow(value?: string | null) {
  return normalizeWorkflowActivationType(value) !== WORKFLOW_TYPES.SERVICE_MAIN;
}
