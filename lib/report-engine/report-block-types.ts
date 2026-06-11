import type {
  ReportEvidenceConfig,
  SmartReportEvidenceItem,
  SmartReportField,
  SmartReportPayload,
  SmartReportSignature,
} from "@/lib/report-engine/smart-report-types";

export type ReportBlockType =
  | "HEADER"
  | "META_FIELDS"
  | "NARRATIVE"
  | "CUSTOM_PARAGRAPH"
  | "CUSTOM_BULLET_LIST"
  | "EVIDENCE_GRID"
  | "SIGNATURES"
  | "FOOTER";

export type ReportBlockPlacement = "LOCKED" | "CONTENT" | "END";

export type ReportBlock = {
  id: string;
  type: ReportBlockType;
  title?: string;
  body?: string;
  fields?: SmartReportField[];
  evidenceItems?: SmartReportEvidenceItem[];
  signatures?: SmartReportSignature[];
  estimatedHeight: number;
  placement: ReportBlockPlacement;
  movable: boolean;
  editable: boolean;
  sourceCustomBlockId?: string;
  targetPageIndex?: number;
  targetZone?: "PAGE_TOP" | "BEFORE_EVIDENCE" | "AFTER_EVIDENCE" | "BEFORE_SIGNATURES";
  order?: number;
};

export type ReportPage = {
  key: string;
  title: string;
  index: number;
  blocks: ReportBlock[];
  payload: SmartReportPayload;
};

export type ReportPaginationOptions = {
  evidenceConfig?: ReportEvidenceConfig;
  pageCapacity?: number;
};