export type CustomReportFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "checkbox"
  | "radio";

export type CustomReportOption = {
  label: string;
  value: string;
};

export type CustomReportField = {
  key: string;
  label: string;
  type: CustomReportFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: CustomReportOption[];
  reportLabel?: string;
  showInReport?: boolean;
  order?: number;
};

export type CustomReportSection = {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: CustomReportField[];
};

export type CustomReportSchema = {
  title: string;
  description?: string;
  version: 1;
  sections: CustomReportSection[];
};

export type CustomReportValues = Record<string, string | number | boolean | string[] | null>;