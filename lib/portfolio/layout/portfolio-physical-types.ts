import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";
import type { PortfolioA4FrameMetrics } from "@/lib/portfolio/layout/portfolio-frame-registry";
import type { PortfolioFieldBand } from "@/lib/portfolio/layout/portfolio-field-layout";

/**
 * High-level semantic role of a physical Portfolio page.
 *
 * This is intentionally broader than pageType. Renderers may use the role
 * for shared visual behavior while pageType describes the precise semantic
 * page.
 */
export type PortfolioPhysicalPageRole =
  | "cover"
  | "section"
  | "performance-divider"
  | "content"
  | "service-output"
  | "report"
  | "evidence"
  | "closing";

/**
 * Exact semantic type of one physical A4 page.
 *
 * Logical sections may generate more than one physical page, therefore
 * continuation page types are explicit.
 */
export type PortfolioPhysicalPageType =
  | "cover"
  | "table-of-contents"
  | "introduction"
  | "introduction-continuation"
  | "educational-identity"
  | "educational-identity-continuation"
  | "biography"
  | "biography-continuation"
  | "qualification"
  | "performance-divider"
  | "service-output"
  | "service-output-continuation"
  | "report"
  | "report-continuation"
  | "report-evidence"
  | "portfolio-evidence"
  | "closing";

/**
 * Layout density selected by the new Portfolio engine.
 *
 * Keep this independent from Report2 and from visual design IDs.
 */
export type PortfolioPhysicalDensity =
  | "normal"
  | "compact"
  | "dense"
  | "minimum-safe"

  /**
   * Legacy logical-page candidates are kept temporarily for
   * backward compatibility before a report page is browser-frozen.
   */
  | "comfortable"
  | "packed"
  | "dense-safe";

/**
 * Field layout strategy selected for a single physical page.
 */
export type PortfolioPhysicalFieldLayout =
  | "balanced-grid"
  | "dense-grid";

/**
 * Number of logical field columns used by a frozen page.
 */
export type PortfolioPhysicalColumnCount = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Evidence arrangement selected for a physical page.
 */
export type PortfolioPhysicalEvidenceLayout =
  | "evidence-1-column"
  | "evidence-2-column";

/**
 * Frozen layout metadata.
 *
 * The planner owns these decisions.
 * Renderers must consume them and must not recalculate them.
 */
export type PortfolioFrozenLayout = {
  candidateId?: string;

  density?: PortfolioPhysicalDensity;

  fieldLayout?: PortfolioPhysicalFieldLayout;

  fieldColumnCount?: PortfolioPhysicalColumnCount;

  fieldBands?: PortfolioFieldBand[];

  evidenceLayout?: PortfolioPhysicalEvidenceLayout;

  primaryEvidenceCount?: 0 | 1 | 2;

  overflowEvidenceCount?: number;

  frozen?: boolean;
};

/**
 * One final or provisional physical A4 page.
 *
 * Important invariant:
 *
 * Logical Page != Physical Page
 *
 * One logical section may create multiple physical pages while preserving
 * source identity through sourceLogicalPageId/sourceSectionIds.
 */
export type PortfolioPhysicalPage = PortfolioFrozenLayout & {
  id: string;

  role: PortfolioPhysicalPageRole;

  pageType?: PortfolioPhysicalPageType;

  /**
   * Stable identity of the logical page/section that generated this
   * physical page. New engine code should prefer this when available.
   */
  sourceLogicalPageId?: string;

  sectionKey?: string;

  sectionTitle?: string;

  sourceSectionId?: string;

  sourceSectionIds: string[];

  blocks: PortfolioBlock[];

  continuationIndex?: number;

  continuationCount?: number;

  dedicatedPage?: boolean;

  startsNewPhysicalPage?: boolean;

  canContinue?: boolean;

  canShareWithNextSection?: boolean;

  outputId?: string;

  reportId?: string;

  /**
   * Existing payload contract is intentionally preserved during the engine
   * rewrite so current snapshots/renderers keep working until later batches.
   */
  payload?: unknown;
};

/**
 * Final physical document consumed by Portfolio preview/print renderers.
 *
 * The indexed collections must point to the same finalized page objects
 * represented in pages. They must never contain stale pre-candidate copies.
 */
export type PortfolioPhysicalDocument = {
  pages: PortfolioPhysicalPage[];

  frame: PortfolioA4FrameMetrics;

  serviceOutputPages: Record<string, PortfolioPhysicalPage[]>;

  reportPages: Record<string, PortfolioPhysicalPage[]>;

  evidencePages: Record<string, PortfolioPhysicalPage[]>;
};

export function isPortfolioFrozenPhysicalPage(
  page: PortfolioPhysicalPage,
): boolean {
  return page.frozen === true;
}