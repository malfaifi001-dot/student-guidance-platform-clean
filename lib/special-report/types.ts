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

export type SpecialReportCustomFieldType = Exclude<
  SpecialReportFieldType,
  never
>;

export type SpecialReportCustomFieldOption = SpecialReportFieldOption & {
  id: string;
};

export type SpecialReportCustomFieldConfig = {
  id: string;
  key: string;
  label: string;
  fixed?: false;
  type: SpecialReportCustomFieldType;
  isRequired: boolean;
  isRepeater: boolean;
  allowOther: boolean;
  options: SpecialReportCustomFieldOption[];
  placeholder?: string;
  helpText?: string;
};

export type SpecialReportRuntimeFieldConfig =
  | { kind: "catalog"; key: string }
  | ({ kind: "custom" } & SpecialReportCustomFieldConfig);

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
  customFields?: SpecialReportCustomFieldConfig[];
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
