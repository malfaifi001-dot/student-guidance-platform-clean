export const SPECIAL_REPORT_SERVICE_SLUG = "special-report";

export type SpecialReportFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "DATE"
  | "SELECT"
  | "MULTI_SELECT";

export type SpecialReportFieldOption = {
  label: string;
  value: string;
  order: number;
};

export type SpecialReportFieldDefinition = {
  key: string;
  label: string;
  type: SpecialReportFieldType;
  isRequired: boolean;
  fixed: boolean;
  isRepeater?: boolean;

  placeholder?: string;
  helpText?: string;

  allowOther?: boolean;

  options?: SpecialReportFieldOption[];
};

export type SpecialReportBuilderState = {
  performanceElement: string;
  fieldKeys: string[];
};

export type SpecialReportRuntimeField = {
  id: string;
  key: string;
  label: string;
  type: string;

  placeholder: string | null;
  helpText: string | null;

  isRequired: boolean;
  order: number;

  dependsOnFieldKey: string | null;
  linkedToValue: string | null;

  allowOther: boolean;
  isRepeater: boolean;

  options: Array<{
    id: string;
    label: string;
    value: string;
    order: number;
    linkedToValue: string | null;
  }>;
};

export type SpecialReportRuntimeStep = {
  id: string;
  title: string;
  description: string | null;
  order: number;

  fields: SpecialReportRuntimeField[];
};

export type SpecialReportRuntimeWorkflow = {
  id: string;
  name: string;
  serviceSlug: string;
  steps: SpecialReportRuntimeStep[];
};

export type SpecialReportRuntimeResponse = {
  serviceId: string;
  workflow: SpecialReportRuntimeWorkflow;
};
