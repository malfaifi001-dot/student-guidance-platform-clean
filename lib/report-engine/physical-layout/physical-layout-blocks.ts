import type { LogicalReportBlock } from "@/components/report-engine/design-renderers/smart-layout/report-smart-table-pagination";

import type {
  PhysicalLayoutBlockRole,
  PhysicalLayoutLogicalPage,
  PhysicalLayoutSourcePage,
} from "./physical-layout-types";

/**
 * ============================================================
 * CENTRAL BLOCK CLASSIFICATION
 * ============================================================
 *
 * هذا هو المكان الوحيد داخل المحرك الذي يقرر:
 *
 * content
 * evidence
 * signature
 * fixed
 *
 * لا React.
 * لا DOM.
 * لا Pagination.
 */

function normalizeText(
  value: unknown,
) {
  return String(value ?? "").trim();
}

export function normalizePhysicalPlacement(
  block: LogicalReportBlock,
) {
  return (
    normalizeText(block?.placement) ||
    "flow"
  );
}

export function isVisiblePhysicalBlock(
  block: LogicalReportBlock,
) {
  return Boolean(block) &&
    block.visible !== false;
}

export function isPhysicalEvidenceBlock(
  block: LogicalReportBlock,
) {
  const kind =
    normalizeText(block?.kind);

  const smartKind =
    normalizeText(
      block?.settings?.smartBlockKind,
    );

  return (
    kind === "evidence-gallery" ||
    kind === "evidence" ||
    smartKind === "evidence-gallery" ||
    smartKind === "evidence"
  );
}

export function isPhysicalSignatureBlock(
  block: LogicalReportBlock,
) {
  const kind =
    normalizeText(block?.kind);

  const smartKind =
    normalizeText(
      block?.settings?.smartBlockKind,
    );

  const title =
    normalizeText(block?.title);

  return (
    kind === "signature-grid" ||
    kind === "signatures" ||
    kind === "approval-signatures" ||
    smartKind === "signature-grid" ||
    smartKind === "signatures" ||
    smartKind === "approval-signatures" ||
    title.includes("توقيع") ||
    title.includes("اعتماد") ||
    Array.isArray(block?.signatures)
  );
}

/**
 * ترتيب الأولوية مقصود:
 *
 * Signature
 * Evidence
 * Fixed
 * Content
 */
export function getPhysicalBlockRole(
  block: LogicalReportBlock,
): PhysicalLayoutBlockRole {
  if (
    isPhysicalSignatureBlock(block)
  ) {
    return "signature";
  }

  if (
    isPhysicalEvidenceBlock(block)
  ) {
    return "evidence";
  }

  if (
    normalizePhysicalPlacement(block) !==
    "flow"
  ) {
    return "fixed";
  }

  return "content";
}

/**
 * Studio Pages -> Classified Logical Pages
 *
 * لا يتم إنشاء أي Physical Page هنا.
 */
export function buildPhysicalLogicalPages(
  pages: PhysicalLayoutSourcePage[],
): PhysicalLayoutLogicalPage[] {
  return pages.map(
    (page, pageIndex) => {
      const sourcePageId =
        normalizeText(page?.id) ||
        `logical-page-${pageIndex + 1}`;

      const sourcePageTitle =
        normalizeText(page?.title) ||
        `صفحة ${pageIndex + 1}`;

      const blocks =
        Array.isArray(page?.blocks)
          ? page.blocks.filter(
              isVisiblePhysicalBlock,
            )
          : [];

      const fixedBlocks:
        LogicalReportBlock[] = [];

      const regularBlocks:
        LogicalReportBlock[] = [];

      const evidenceBlocks:
        LogicalReportBlock[] = [];

      const signatureBlocks:
        LogicalReportBlock[] = [];

      for (const block of blocks) {
        switch (
          getPhysicalBlockRole(block)
        ) {
          case "signature":
            signatureBlocks.push(block);
            break;

          case "evidence":
            evidenceBlocks.push(block);
            break;

          case "fixed":
            fixedBlocks.push(block);
            break;

          default:
            regularBlocks.push(block);
            break;
        }
      }

      return {
        sourcePageId,
        sourcePageTitle,

        kind:
          normalizeText(page?.kind) ||
          "content",

        fixedBlocks,
        regularBlocks,
        evidenceBlocks,
        signatureBlocks,
      };
    },
  );
}

export function hasSingleLogicalSource(
  sourcePageIds: string[],
) {
  const normalized =
    sourcePageIds
      .map(normalizeText)
      .filter(Boolean);

  return (
    new Set(normalized).size <= 1
  );
}