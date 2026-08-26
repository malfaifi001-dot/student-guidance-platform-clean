import type {
  PortfolioPhysicalColumnCount,
  PortfolioPhysicalDensity,
  PortfolioPhysicalEvidenceLayout,
  PortfolioPhysicalFieldLayout,
} from "@/lib/portfolio/layout/portfolio-physical-types";

export type PortfolioSmartLifecyclePhase =
  | "DIRTY"
  | "PLANNING"
  | "MEASURING"
  | "STABILIZING"
  | "READY"
  | "FROZEN";

export type PortfolioSmartBlockRole =
  | "title"
  | "fields"
  | "narrative"
  | "table"
  | "evidence"
  | "qualification"
  | "educational-identity"
  | "service-output"
  | "general";

export type PortfolioOverflowSeverity =
  | "none"
  | "tiny"
  | "small"
  | "medium"
  | "large";

export type PortfolioMeasuredBlock = {
  role: PortfolioSmartBlockRole;

  topPx: number;

  bottomPx: number;

  heightPx: number;
};

/**
 * Candidate identity for ONE physical page.
 *
 * Candidate selection must eventually be page-scoped. It must never be
 * treated as one global Portfolio-wide layout decision.
 */
export type PortfolioPageCandidate = {
  id: string;

  pageId: string;

  density: PortfolioPhysicalDensity;

  fieldLayout: PortfolioPhysicalFieldLayout;

  columnCount: PortfolioPhysicalColumnCount;

  evidenceCount: 0 | 1 | 2;

  evidenceLayout: PortfolioPhysicalEvidenceLayout;

  readabilityScore: number;
};

/**
 * Real DOM measurement result for ONE physical page candidate.
 *
 * No metric in this object represents several physical pages combined.
 */
export type PortfolioPageMeasurement = {
  pageId: string;

  candidateId: string;

  phase: PortfolioSmartLifecyclePhase;

  stable: boolean;

  fits: boolean;

  overflowPx: number;

  blockOverflowPx: number;

  scrollOverflowPx: number;

  boundingOverflowPx: number;

  mainContentOverflowPx: number;

  pageHeightPx: number;

  viewportHeightPx: number;

  headerBoundaryPx: number;

  footerBoundaryPx: number;

  contentTopPx: number;

  contentBottomPx: number;

  mainContentBottomPx: number;

  fieldHeightPx: number;

  narrativeHeightPx: number;

  evidenceHeightPx: number;

  tableHeightPx: number;

  dominantRole: PortfolioSmartBlockRole;

  severity: PortfolioOverflowSeverity;

  /**
   * Field measurements are scoped to one physical page.
   * Later batches will move to stable field-instance IDs rather than
   * globally keyed field names.
   */
  fieldHeights: Record<string, number>;

  blocks: PortfolioMeasuredBlock[];
};

/**
 * One frozen page decision produced after candidate measurement.
 */
export type PortfolioFrozenPageDecision = {
  pageId: string;

  candidateId: string;

  density: PortfolioPhysicalDensity;

  fieldLayout: PortfolioPhysicalFieldLayout;

  columnCount: PortfolioPhysicalColumnCount;

  evidenceCount: 0 | 1 | 2;

  evidenceLayout: PortfolioPhysicalEvidenceLayout;

  frozen: true;
};