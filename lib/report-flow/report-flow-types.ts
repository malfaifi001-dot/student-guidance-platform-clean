import type { ReportLanguageMode } from "@/lib/report-engine/report-language-mode";
import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

export type ReportFlowFieldSource = "primary" | "detail";

export type ReportFlowPrepareField = {
  id: string;
  source: ReportFlowFieldSource;
  key: string;
  label: string;
  value: string;
  originalLabel: string;
  originalValue: string;
  selected: boolean;
  technical?: boolean;
};

export type ReportFlowExecutionSummarySource = "AI" | "MANUAL" | "FALLBACK";

export type ReportFlowPreparation = {
  version: 1;
  caseId: string;
  variantId: string;
  reportType: string;
  languageMode: ReportLanguageMode;
  selectedFieldIds: string[];
  fields: ReportFlowPrepareField[];
  executionSummary: string;
  executionSummarySource: ReportFlowExecutionSummarySource;
  updatedAt: string;
};

export type ReportFlowPrepareContext = {
  caseId: string;
  languageMode: ReportLanguageMode;
  title: string;
  serviceName: string;
  serviceSlug: string;
  studentName?: string;
  executorName?: string;
  executorTitle?: string;
};

export type ReportFlowApplyResult = {
  payload: SmartReportPayload;
  preparation: ReportFlowPreparation;
};

export type ReportFlowSummaryField = Pick<
  ReportFlowPrepareField,
  "key" | "label" | "value"
>;

export type SmartReportFieldWithSource = SmartReportField & {
  source?: ReportFlowFieldSource;
};
