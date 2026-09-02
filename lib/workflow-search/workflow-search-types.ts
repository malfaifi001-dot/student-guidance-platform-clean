export type WorkflowSearchResultType = "SERVICE" | "WORKFLOW" | "STEP" | "FIELD";

export type WorkflowSearchResult = {
  id: string;
  type: WorkflowSearchResultType;
  title: string;
  subtitle?: string;
  serviceId: string;
  serviceSlug?: string;
  serviceTitle: string;
  workflowId: string;
  workflowTitle: string;
  stepId?: string;
  stepTitle?: string;
  fieldId?: string;
  fieldKey?: string;
  fieldLabel?: string;
  href: string;
  score: number;
};

export const WORKFLOW_SEARCH_MIN_QUERY_LENGTH = 2;
export const WORKFLOW_SEARCH_RESULT_LIMIT = 10;
