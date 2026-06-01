export const WORKFLOW_TYPES = {
  DEFAULT: "default",
} as const;

export type WorkflowType = (typeof WORKFLOW_TYPES)[keyof typeof WORKFLOW_TYPES];

export function normalizeWorkflowType(value?: string | null): WorkflowType {
  if (!value) {
    return WORKFLOW_TYPES.DEFAULT;
  }

  if (value === WORKFLOW_TYPES.DEFAULT) {
    return WORKFLOW_TYPES.DEFAULT;
  }

  return WORKFLOW_TYPES.DEFAULT;
}
