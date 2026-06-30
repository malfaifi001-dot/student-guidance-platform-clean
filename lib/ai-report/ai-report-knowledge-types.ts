export type AiReportKnowledgeSourceType = "value_bank" | "manual_field";

export type AiReportKnowledgeItem = {
  id: string;
  sourceType: AiReportKnowledgeSourceType;
  reportSlug: string;
  reportName: string;
  performanceElement: string;
  reportCategory: string;
  templatePattern: string;
  category: string;
  fieldKey: string;
  fieldLabel: string;
  inputType: string;
  optionLabel: string;
  sourcePage?: string;
  searchableText: string;
  keywords: string[];
};

export type AiReportKnowledgeReport = {
  batchId?: string;
  reportSlug: string;
  reportName: string;
  performanceElement: string;
  reportCategory: string;
  templatePattern: string;
  keywords: string[];
};

export type AiReportKnowledgeBank = {
  schemaVersion: number;
  generatedAt: string;
  sourceFile: string;
  counts: {
    reports: number;
    valueRows: number;
    manualRows: number;
    items: number;
    coverage: number;
  };
  reports: AiReportKnowledgeReport[];
  items: AiReportKnowledgeItem[];
  coverage: unknown[];
};

export type AiReportKnowledgeMatch = AiReportKnowledgeItem & {
  score: number;
  matchedTerms: string[];
};

export type AiReportKnowledgeReportMatch = AiReportKnowledgeReport & {
  score: number;
  matchedItemsCount: number;
};

export type AiReportKnowledgeSearchResult = {
  prompt: string;
  normalizedPrompt: string;
  topReports: AiReportKnowledgeReportMatch[];
  items: AiReportKnowledgeMatch[];
};