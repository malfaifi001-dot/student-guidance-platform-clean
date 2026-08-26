import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";

export type PortfolioPhysicalPageRole = "cover" | "section" | "performance-divider" | "content" | "service-output" | "report" | "evidence" | "closing";

/** Explicit physical roles keep page composition independent from the data shape. */
export type PortfolioPhysicalPageType =
  | "cover"
  | "table-of-contents"
  | "introduction"
  | "educational-identity"
  | "biography"
  | "qualification"
  | "performance-divider"
  | "service-output"
  | "report"
  | "report-evidence"
  | "portfolio-evidence"
  | "closing";

export type PortfolioPhysicalPage = {
  id: string;
  role: PortfolioPhysicalPageRole;
  pageType?: PortfolioPhysicalPageType;
  sectionKey?: string;
  sectionTitle?: string;
  sourceSectionId?: string;
  blocks: PortfolioBlock[];
  sourceSectionIds: string[];
  continuationIndex?: number;
  continuationCount?: number;
  dedicatedPage?: boolean;
  startsNewPhysicalPage?: boolean;
  canContinue?: boolean;
  canShareWithNextSection?: boolean;
  density?: import("@/lib/portfolio/layout/portfolio-smart-a4-types").PortfolioSmartLayoutCandidate;
  evidenceLayout?: import("@/lib/portfolio/layout/portfolio-smart-a4-types").PortfolioEvidenceLayout;
  primaryEvidenceCount?: 0 | 1 | 2;
  overflowEvidenceCount?: number;
  payload?: unknown;
};

export type PortfolioPhysicalDocument = {
  pages: PortfolioPhysicalPage[];
  frame: import("@/lib/portfolio/layout/portfolio-frame-registry").PortfolioA4FrameMetrics;
  serviceOutputPages: Record<string, PortfolioPhysicalPage[]>;
  reportPages: Record<string, PortfolioPhysicalPage[]>;
  evidencePages: Record<string, PortfolioPhysicalPage[]>;
};
