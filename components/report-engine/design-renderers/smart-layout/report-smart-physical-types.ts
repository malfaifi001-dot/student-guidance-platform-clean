import type { LogicalReportBlock } from "./report-smart-table-pagination";

export type ReportPhysicalPageRole =
  | "primary"
  | "evidence"
  | "signature";

export type ReportPhysicalPageModel = {
  id: string;
  title: string;
  kind: string;
  blocks: LogicalReportBlock[];
  sourcePageIds: string[];
  corePhysicalPageId: string;
  physicalPageRole: ReportPhysicalPageRole;
  physicalPageIndex?: number;
  physicalIndexWithinLogicalPage?: number;
};

export type ReportPhysicalPageComposition = {
  corePhysicalPageId: string;
  pages: ReportPhysicalPageModel[];
};

export type ReportTwoPhysicalNavigationItem = {
  physicalPageId: string;
  corePhysicalPageId: string;
  sourceLogicalPageId: string;
  sourcePageIds: string[];
  label: string;
  physicalPageIndex: number;
  physicalIndexWithinLogicalPage: number;
  role: ReportPhysicalPageRole;
};
