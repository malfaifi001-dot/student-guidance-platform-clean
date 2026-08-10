import type { LogicalReportBlock } from "@/components/report-engine/design-renderers/smart-layout/report-smart-table-pagination";

import type {
  PhysicalLayoutPageRole,
  PhysicalLayoutPolicy,
} from "./physical-layout-types";

import {
  isPhysicalEvidenceBlock,
  isPhysicalSignatureBlock,
} from "./physical-layout-blocks";

/**
 * ============================================================
 * GLOBAL PAGINATION POLICY
 * ============================================================
 *
 * هذه قوانين المنصة وليست إعدادات خاصة بأي Design.
 */

export const DEFAULT_PHYSICAL_LAYOUT_POLICY:
  PhysicalLayoutPolicy = {
    contentNeverDrops: true,

    evidenceNeverDrops: true,

    signatureNeverDrops: true,

    singleLogicalPagePerPhysicalPage:
      true,

    finalRendererNeverPaginates:
      true,

    keepEvidenceWithLonelySignature:
      true,
  };

/**
 * يحدد Role النهائي بناءً على محتوى الصفحة فقط.
 */
export function resolvePhysicalPageRole(
  blocks: LogicalReportBlock[],
): PhysicalLayoutPageRole {
  const hasEvidence =
    blocks.some(
      isPhysicalEvidenceBlock,
    );

  const hasSignature =
    blocks.some(
      isPhysicalSignatureBlock,
    );

  if (
    hasEvidence &&
    hasSignature
  ) {
    return "evidence-signature";
  }

  if (hasSignature) {
    return "signature";
  }

  if (hasEvidence) {
    return "evidence";
  }

  return "content";
}

export function shouldKeepEvidenceWithSignature({
  policy,
  hasSignature,
  hasAvailableEvidence,
  signatureNeedsOwnPage,
}: {
  policy: PhysicalLayoutPolicy;
  hasSignature: boolean;
  hasAvailableEvidence: boolean;
  signatureNeedsOwnPage: boolean;
}) {
  return Boolean(
    policy.keepEvidenceWithLonelySignature &&
      hasSignature &&
      hasAvailableEvidence &&
      signatureNeedsOwnPage,
  );
}

/**
 * Compatibility helper مؤقت للمحرك القديم.
 *
 * لا ينشئ صفحة.
 * لا يكرر شاهدًا.
 * فقط ينقل شاهدًا من مصدره إلى مجموعة التوقيع.
 *
 * سيزال في الدفعة الثانية عند استبدال Planner.
 */
export function moveLastEvidenceBesideSignature({
  evidencePages,
  signatureBlocks,
  enabled,
}: {
  evidencePages: LogicalReportBlock[][];
  signatureBlocks: LogicalReportBlock[];
  enabled: boolean;
}) {
  const normalizedEvidencePages =
    evidencePages.map(
      (page) => [...page],
    );

  if (
    !enabled ||
    signatureBlocks.length === 0
  ) {
    return {
      evidencePages:
        normalizedEvidencePages,

      signaturePageBlocks:
        [...signatureBlocks],
    };
  }

  for (
    let pageIndex =
      normalizedEvidencePages.length - 1;
    pageIndex >= 0;
    pageIndex -= 1
  ) {
    const pageBlocks =
      normalizedEvidencePages[
        pageIndex
      ];

    for (
      let blockIndex =
        pageBlocks.length - 1;
      blockIndex >= 0;
      blockIndex -= 1
    ) {
      const block =
        pageBlocks[blockIndex];

      if (
        !isPhysicalEvidenceBlock(block)
      ) {
        continue;
      }

      pageBlocks.splice(
        blockIndex,
        1,
      );

      return {
        evidencePages:
          normalizedEvidencePages.filter(
            (page) =>
              page.length > 0,
          ),

        signaturePageBlocks: [
          block,
          ...signatureBlocks,
        ],
      };
    }
  }

  return {
    evidencePages:
      normalizedEvidencePages,

    signaturePageBlocks:
      [...signatureBlocks],
  };
}