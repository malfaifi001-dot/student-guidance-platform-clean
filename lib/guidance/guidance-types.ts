export type GuidanceRole = "COUNSELOR" | "TEACHER" | "ACTIVITY_LEADER";

export type GuidanceContextKey =
  | "student-data-import"
  | "service-overview"
  | "workflow-runtime"
  | "case-details"
  | "report-prepare"
  | "report-preview"
  | "calendar"
  | "report-studio";

export type GuidanceStep = {
  id: string;
  target: string;
  title: string;
  description?: string;
  allowedRoles?: GuidanceRole[];
  requiredCapability?: string;
};

export type GuidanceDefinition = {
  context: GuidanceContextKey;
  steps: GuidanceStep[];
};

export type GuidanceScopeConfig = {
  context: GuidanceContextKey;
  capabilities?: string[];
  autoStart?: boolean;
};

export type GuidanceProgressStatus =
  | "unseen"
  | "in_progress"
  | "completed"
  | "skipped";

export type GuidanceProgress = {
  status: GuidanceProgressStatus;
  lastStepIndex: number;
  updatedAt: string;
};
