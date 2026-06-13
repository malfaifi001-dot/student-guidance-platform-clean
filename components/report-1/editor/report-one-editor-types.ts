import type { SmartReportField, SmartReportPayload } from "@/lib/report-engine/smart-report-types";

export type ReportOneTemplateInfo = {
  id: string;
  name: string;
  description?: string;
  templateJson?: Record<string, unknown> | null;
};

export type ReportOneEditorPage = {
  id: string;
  title: string;
  kind?: "admin" | "manual" | "content";
  sourceTemplatePageId?: string | null;
};

export type ReportOneEditableField = SmartReportField & {
  id: string;
  visible: boolean;
};

export type ReportOneTableSettings = {
  highlightHeader: boolean;
  highlightFirstColumn: boolean;
  stripedRows: boolean;
  rounded: boolean;
  compact: boolean;
  repeatHeader: boolean;
};

export type ReportOneEditableBlock = {
  id: string;
  pageId?: string;
  type: "PARAGRAPH" | "BULLET_LIST" | "TABLE" | "EVIDENCE";
  title: string;
  body?: string;
  rows?: string[][];
  columns?: string[];
  tableSettings?: ReportOneTableSettings;
};

export type ReportOneEvidenceSizePreset =
  | "NORMAL_82_82"
  | "LARGE_160_178"
  | "WIDE_120_58"
  | "PORTRAIT_70_95"
  | "CUSTOM";

export type ReportOneEvidenceSettings = {
  enabled: boolean;
  perPage: 1 | 2 | 4;
  showCaptions: boolean;
  fit: "contain" | "cover";
  aspectRatio:
    | "LANDSCAPE_4_3"
    | "LANDSCAPE_16_9"
    | "SQUARE_1_1"
    | "PORTRAIT_3_4";
  sizePreset: ReportOneEvidenceSizePreset;
  imageWidthMm: number;
  imageHeightMm: number;
  gapMm: number;
};

export type ReportOneDocumentDraft = {
  title: string;
  template: ReportOneTemplateInfo | null;
  fields: ReportOneEditableField[];
  blocks: ReportOneEditableBlock[];
  pages?: ReportOneEditorPage[];
  activePageId?: string;
  evidenceSettings?: ReportOneEvidenceSettings;
  payload: SmartReportPayload;
};