import type {
  PortfolioPageMeasurement,
  PortfolioSmartBlockRole,
  PortfolioOverflowSeverity,
} from "@/lib/portfolio/engine/portfolio-smart-measure-types";

import type {
  PortfolioSmartCandidate,
} from "@/lib/portfolio/engine/portfolio-smart-candidates";


const OVERFLOW_TOLERANCE_PX = 2;


function getSeverity(
  overflowPx: number,
): PortfolioOverflowSeverity {
  if (overflowPx <= OVERFLOW_TOLERANCE_PX) {
    return "none";
  }

  if (overflowPx <= 12) {
    return "tiny";
  }

  if (overflowPx <= 48) {
    return "small";
  }

  if (overflowPx <= 120) {
    return "medium";
  }

  return "large";
}


function getBlockRole(
  element: HTMLElement,
): PortfolioSmartBlockRole {
  const role =
    element.dataset.portfolioSmartRole;

  if (
    role === "title" ||
    role === "fields" ||
    role === "narrative" ||
    role === "table" ||
    role === "evidence" ||
    role === "qualification" ||
    role === "educational-identity" ||
    role === "service-output"
  ) {
    return role;
  }

  return "general";
}


function getFieldInstanceKey(
  field: HTMLElement,
  pageId: string,
  index: number,
) {
  const explicit =
    field.dataset.portfolioFieldInstance;

  if (explicit) {
    return explicit;
  }

  const fieldKey =
    field.dataset.portfolioFieldKey ||
    `field-${index}`;

  /**
   * Important:
   * field keys are page-scoped.
   *
   * Two reports may contain the same semantic field key,
   * therefore a global field-key dictionary is forbidden.
   */
  return `${pageId}::${fieldKey}::${index}`;
}


/**
 * Measures exactly ONE rendered physical A4 page.
 *
 * This function never combines metrics from multiple pages.
 */
export function measurePortfolioPhysicalPage(
  page: HTMLElement,
  pageId: string,
  candidate: PortfolioSmartCandidate,
): PortfolioPageMeasurement {
  const pageRect =
    page.getBoundingClientRect();

  const content =
    page.querySelector<HTMLElement>(
      "[data-portfolio-smart-content], [data-portfolio-safe-content]",
    );

  const header =
    page.querySelector<HTMLElement>(
      "[data-portfolio-page-header], [data-portfolio-header-boundary]",
    );

  const footer =
    page.querySelector<HTMLElement>(
      [
        "[data-portfolio-page-footer]",
        "[data-portfolio-footer-boundary]",
        ".atlas-footer",
        ".hzn-footer",
        ".moe24-page-footer",
      ].join(","),
    );

  const contentRect =
    content?.getBoundingClientRect();

  const headerRect =
    header?.getBoundingClientRect();

  const footerRect =
    footer?.getBoundingClientRect();

  const contentTopAbsolute =
    Math.max(
      contentRect?.top ?? pageRect.top,
      headerRect?.bottom ?? pageRect.top,
    );

  const contentBottomAbsolute =
    Math.min(
      contentRect?.bottom ?? pageRect.bottom,
      footerRect?.top ?? pageRect.bottom,
    );

  const blockElements =
    Array.from(
      page.querySelectorAll<HTMLElement>(
        "[data-portfolio-smart-role]",
      ),
    );

  const blocks =
    blockElements.map((block) => {
      const rect =
        block.getBoundingClientRect();

      return {
        role: getBlockRole(block),
        topPx:
          rect.top - pageRect.top,
        bottomPx:
          rect.bottom - pageRect.top,
        heightPx:
          rect.height,
      };
    });

  const mainContentBottomAbsolute =
    blockElements.length
      ? Math.max(
          ...blockElements.map(
            (block) =>
              block.getBoundingClientRect().bottom,
          ),
        )
      : contentTopAbsolute;

  const blockOverflowPx =
    Math.max(
      0,
      mainContentBottomAbsolute -
        contentBottomAbsolute,
    );

  const scrollOverflowPx =
    content
      ? Math.max(
          0,
          content.scrollHeight -
            content.clientHeight,
        )
      : 0;

  const boundingOverflowPx =
    contentRect
      ? Math.max(
          0,
          contentRect.bottom -
            (footerRect?.top ??
              pageRect.bottom),
        )
      : 0;

  const overflowPx =
    Math.max(
      blockOverflowPx,
      scrollOverflowPx,
      boundingOverflowPx,
    );

  const roleHeights = (
    role: PortfolioSmartBlockRole,
  ) =>
    blocks
      .filter(
        (block) =>
          block.role === role,
      )
      .reduce(
        (sum, block) =>
          sum + block.heightPx,
        0,
      );

  const dominantBlock =
    [...blocks]
      .sort(
        (first, second) =>
          second.bottomPx -
          first.bottomPx,
      )[0];

  const fieldElements =
    Array.from(
      page.querySelectorAll<HTMLElement>(
        "[data-portfolio-field-key]",
      ),
    );

  const fieldHeights =
    Object.fromEntries(
      fieldElements.map(
        (field, index) => [
          getFieldInstanceKey(
            field,
            pageId,
            index,
          ),

          field
            .getBoundingClientRect()
            .height,
        ],
      ),
    );

  return {
    pageId,

    candidateId:
      candidate.id,

    phase: "READY",

    stable: true,

    fits:
      overflowPx <=
      OVERFLOW_TOLERANCE_PX,

    overflowPx,

    blockOverflowPx,

    scrollOverflowPx,

    boundingOverflowPx,

    mainContentOverflowPx:
      blockOverflowPx,

    pageHeightPx:
      pageRect.height,

    viewportHeightPx:
      contentRect?.height ?? 0,

    headerBoundaryPx:
      (headerRect?.bottom ??
        pageRect.top) -
      pageRect.top,

    footerBoundaryPx:
      (footerRect?.top ??
        pageRect.bottom) -
      pageRect.top,

    contentTopPx:
      contentTopAbsolute -
      pageRect.top,

    contentBottomPx:
      contentBottomAbsolute -
      pageRect.top,

    mainContentBottomPx:
      mainContentBottomAbsolute -
      pageRect.top,

    fieldHeightPx:
      roleHeights("fields") ||
      fieldElements.reduce(
        (sum, field) =>
          sum +
          field
            .getBoundingClientRect()
            .height,
        0,
      ),

    narrativeHeightPx:
      roleHeights("narrative"),

    evidenceHeightPx:
      roleHeights("evidence"),

    tableHeightPx:
      roleHeights("table"),

    dominantRole:
      dominantBlock?.role ??
      "general",

    severity:
      getSeverity(
        overflowPx,
      ),

    fieldHeights,

    blocks,
  };
}