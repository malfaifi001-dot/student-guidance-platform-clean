export type IssuedReportSourceType =
  | "GUIDANCE_REPORT"
  | "REPORT_SNAPSHOT";

export type StatisticsIssuedReportFilters = {
  serviceSlug?: string;
  from?: Date;
  to?: Date;
};

export type NormalizedIssuedReport = {
  sourceType: IssuedReportSourceType;
  sourceId: string;
  normalizedId: string;

  caseEntryId: string;
  schoolAccountId: string | null;

  serviceId: string;
  serviceSlug: string;
  serviceName: string;

  title: string;
  issuedAt: Date;
};

export type StatisticsServiceOption = {
  id: string;
  slug: string;
  name: string;
  eligibleCaseCount: number;
  issuedReportCount: number;
};

export type StatisticsDatePreset =
  | "ALL_TIME"
  | "LAST_30_DAYS"
  | "CURRENT_MONTH"
  | "CURRENT_YEAR"
  | "CUSTOM";

export type StatisticsDateRange = {
  preset: StatisticsDatePreset;
  from: Date;
  to: Date;
  label: string;
};

export type StatisticsFieldOption = {
  value: string;
  label: string;
  order: number;
  linkedToValue: string | null;
};

export type StatisticsFieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: string;

  stepId: string;
  stepKey: string;
  stepTitle: string;
  stepOrder: number;
  order: number;

  dependsOnFieldKey: string | null;
  linkedToValue: string | null;

  options: StatisticsFieldOption[];
};

export type StatisticsFieldValueCount = {
  metricId: string;
  value: string;
  label: string;
  caseCount: number;
};

export type StatisticsPreparedField = {
  id: string;
  key: string;
  label: string;
  type: string;

  stepKey: string;
  stepTitle: string;
  stepOrder: number;
  order: number;

  dependsOnFieldKey: string | null;
  caseCount: number;

  values: StatisticsFieldValueCount[];
};

export type StatisticsPreparedWorkflowStep = {
  key: string;
  title: string;
  order: number;
  fields: StatisticsPreparedField[];
};

export type StatisticsPrepareResult = {
  service: {
    id: string;
    slug: string;
    name: string;
  };

  dateRange: {
    preset: StatisticsDatePreset;
    from: string;
    to: string;
    label: string;
  };

  sourceCaseCount: number;
  sourceReportCount: number;

  workflowSteps: StatisticsPreparedWorkflowStep[];

  analysisMode: "DETERMINISTIC";
  executiveDescription: null;
};

export type StatisticsValueSelection = {
  fieldKey: string;
  value: string;
};

export type StatisticsSelectedMetric = {
  metricId: string;

  fieldKey: string;
  fieldLabel: string;

  value: string;
  valueLabel: string;

  caseCount: number;
};

export type StatisticsAiAnalysis = {
  executiveDescription: string;
  insights: string[];
  recommendations: string[];

  analysisMode:
    | "DEEPSEEK"
    | "FALLBACK";
};

export type StatisticsDescriptionResult = {
  service: {
    id: string;
    slug: string;
    name: string;
  };

  dateRange: {
    preset: StatisticsDatePreset;
    from: string;
    to: string;
    label: string;
  };

  sourceCaseCount: number;
  sourceReportCount: number;

  selectedMetrics: StatisticsSelectedMetric[];
  analysis: StatisticsAiAnalysis;
};