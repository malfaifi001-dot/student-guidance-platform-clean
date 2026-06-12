import type {
  ReportEvidenceConfig,
  SmartReportEvidenceItem,
  SmartReportField,
  SmartReportPayload,
  SmartReportSignature,
} from "@/lib/report-engine/smart-report-types";

export type ReportDocumentPageKind = "AUTO" | "MANUAL";

export type ReportDocumentBlockType =
  | "META_FIELDS"
  | "NARRATIVE"
  | "PARAGRAPH"
  | "BULLET_LIST"
  | "TABLE"
  | "EVIDENCE"
  | "SIGNATURES";

export type ReportDocumentBlockBase = {
  id: string;
  type: ReportDocumentBlockType;
  title?: string;
  order: number;
  locked?: boolean;
  source?: "SYSTEM" | "USER";
};

export type ReportMetaFieldsBlock = ReportDocumentBlockBase & {
  type: "META_FIELDS";
  fields: SmartReportField[];
};

export type ReportNarrativeBlock = ReportDocumentBlockBase & {
  type: "NARRATIVE";
  body: string;
};

export type ReportParagraphBlock = ReportDocumentBlockBase & {
  type: "PARAGRAPH";
  body: string;
};

export type ReportBulletListBlock = ReportDocumentBlockBase & {
  type: "BULLET_LIST";
  body: string;
};

export type ReportEvidenceBlock = ReportDocumentBlockBase & {
  type: "EVIDENCE";
  evidenceItems: SmartReportEvidenceItem[];
  evidenceConfig?: ReportEvidenceConfig;
};

export type ReportSignatureBlock = ReportDocumentBlockBase & {
  type: "SIGNATURES";
  signatures: SmartReportSignature[];
};

export type ReportTableCell = {
  id: string;
  value: string;
};

export type ReportTableColumn = {
  id: string;
  title: string;
  width?: number;
};

export type ReportTableRow = {
  id: string;
  cells: ReportTableCell[];
};

export type ReportTableSettings = {
  highlightHeaderRow: boolean;
  highlightFirstColumn: boolean;
  repeatHeaderOnPageBreak: boolean;
  rounded: boolean;
  compact: boolean;
};

export type ReportTableBlock = ReportDocumentBlockBase & {
  type: "TABLE";
  settings: ReportTableSettings;
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
};

export type ReportDocumentBlock =
  | ReportMetaFieldsBlock
  | ReportNarrativeBlock
  | ReportParagraphBlock
  | ReportBulletListBlock
  | ReportTableBlock
  | ReportEvidenceBlock
  | ReportSignatureBlock;

export type ReportDocumentPage = {
  id: string;
  title: string;
  order: number;
  kind: ReportDocumentPageKind;
  blocks: ReportDocumentBlock[];
};

export type ReportDocumentDraft = {
  id: string;
  caseId: string;
  variantId: string;
  title: string;
  payload: SmartReportPayload;
  evidenceConfig: ReportEvidenceConfig;
  pages: ReportDocumentPage[];
  updatedAt: string;
};

export type ReportDocumentEditorState = {
  draft: ReportDocumentDraft;
  activePageId: string;
  selectedBlockId?: string | null;
};

export type ReportDocumentBlockInsertType =
  | "PARAGRAPH"
  | "BULLET_LIST"
  | "TABLE";

export type ReportDocumentSaveSnapshot = {
  payload: SmartReportPayload;
  documentDraft: ReportDocumentDraft;
};