export type ReportTextTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type ReportTextTemplateKind =
  | "official"
  | "brief"
  | "visual"
  | "meeting"
  | "followUp"
  | "letter"
  | "caseStudy"
  | "statistical";

export type ReportTextBlockType =
  | "intro"
  | "purpose"
  | "execution"
  | "indicator"
  | "evidence"
  | "results"
  | "recommendations"
  | "closing"
  | "custom";

export type ReportTextVariableGroup =
  | "school"
  | "student"
  | "case"
  | "service"
  | "evidence"
  | "system";

export type ReportTextVariable = {
  key: string;
  label: string;
  description: string;
  example: string;
  group: ReportTextVariableGroup;
};

export type ReportTextBlock = {
  id: string;
  title: string;
  type: ReportTextBlockType;
  body: string;
  isRequired: boolean;
  isLockedForCounselor: boolean;
  showWhenVariableExists?: string;
  order: number;
};

export type ReportTextTemplatePreset = {
  id: string;
  name: string;
  description: string;
  serviceSlug: string;
  serviceName: string;
  kind: ReportTextTemplateKind;
  status: ReportTextTemplateStatus;
  version: number;
  updatedAt: string;
  blocks: ReportTextBlock[];
};

export type ReportTextStudioValidationIssue = {
  id: string;
  level: "error" | "warning" | "info";
  title: string;
  description: string;
  blockId?: string;
};