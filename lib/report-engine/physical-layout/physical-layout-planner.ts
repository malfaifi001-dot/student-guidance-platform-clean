import {
  createSemanticInputFingerprint,
} from "@/components/report-engine/design-renderers/smart-layout/report-smart-lifecycle";

import type {
  LogicalReportBlock,
} from "@/components/report-engine/design-renderers/smart-layout/report-smart-table-pagination";

import {
  isPhysicalEvidenceBlock,
} from "./physical-layout-blocks";

import {
  DEFAULT_PHYSICAL_LAYOUT_POLICY,
  resolvePhysicalPageRole,
  shouldKeepEvidenceWithSignature,
} from "./physical-layout-policy";

import type {
  PhysicalLayoutCandidate,
  PhysicalLayoutFrozenSettings,
  PhysicalLayoutLogicalPage,
  PhysicalLayoutMeasureCandidate,
  PhysicalLayoutMeasurement,
  PhysicalLayoutPage,
  PhysicalLayoutPlan,
  PhysicalLayoutPolicy,
} from "./physical-layout-types";

/**
 * ============================================================
 * PHYSICAL LAYOUT PLANNER
 * ============================================================
 *
 * هذا هو المالك الوحيد للـ Physical Pagination.
 *
 * تم إضافة Decision Trace تشخيصي.
 *
 * لا يغير القرارات.
 * فقط يسجل كل قرار اتخذه المحرك ولماذا.
 */

type DraftPhysicalPage = {
  sourceLogicalPageId: string;
  sourcePageTitle: string;
  kind: string;

  blocks: LogicalReportBlock[];

  measurement: PhysicalLayoutMeasurement;
};

type TracePayload =
  Record<string, unknown>;

const TRACE_ENABLED =
  process.env.NODE_ENV !==
  "production";

let traceSequence = 0;

function trace(
  event: string,
  payload: TracePayload = {},
) {
  if (!TRACE_ENABLED) {
    return;
  }

  traceSequence += 1;

  const traceRow = {
    sequence: traceSequence,
    event,
    ...payload,
  };

  const traceGlobal =
    globalThis as typeof globalThis & {
      __REPORT_PHYSICAL_TRACE__?: Array<
        Record<string, unknown>
      >;
    };

  if (
    !Array.isArray(
      traceGlobal.__REPORT_PHYSICAL_TRACE__,
    )
  ) {
    traceGlobal.__REPORT_PHYSICAL_TRACE__ = [];
  }

  traceGlobal.__REPORT_PHYSICAL_TRACE__.push(
    traceRow,
  );

  console.log(
    `[REPORT-PHYSICAL-TRACE #${traceSequence}] ${event}`,
    payload,
  );
}

function describeBlock(
  block: LogicalReportBlock,
) {
  return {
    id:
      block?.id || null,

    kind:
      block?.kind || null,

    title:
      block?.title || null,

    placement:
      block?.placement || null,
  };
}

function describeBlocks(
  blocks: LogicalReportBlock[],
) {
  return blocks.map(
    describeBlock,
  );
}

function describeMeasurement(
  measurement:
    PhysicalLayoutMeasurement,
) {
  return {
    fits:
      measurement.fits,

    overflowPx:
      measurement.overflowPx,

    blockOverflowPx:
      measurement.blockOverflowPx ?? null,

    scrollOverflowPx:
      measurement.scrollOverflowPx ?? null,

    boundingOverflowPx:
      measurement.boundingOverflowPx ?? null,

    mainContentOverflowPx:
      measurement.mainContentOverflowPx ?? null,

    candidate:
      measurement.candidate ||
      null,

    density:
      measurement.density ||
      null,

    fieldLayout:
      measurement.fieldLayout ||
      null,
  };
}

function cloneBlocks(
  blocks: LogicalReportBlock[],
) {
  return [...blocks];
}

function toFrozenSettings(
  measurement:
    | PhysicalLayoutMeasurement
    | null
    | undefined,
): PhysicalLayoutFrozenSettings {
  return {
    candidate:
      measurement?.candidate ||
      null,

    density:
      measurement?.density ||
      null,

    fieldLayout:
      measurement?.fieldLayout ||
      null,
  };
}

function buildCandidate({
  source,
  blocks,
}: {
  source: PhysicalLayoutLogicalPage;
  blocks: LogicalReportBlock[];
}): PhysicalLayoutCandidate {
  return {
    sourcePageId:
      source.sourcePageId,

    sourcePageTitle:
      source.sourcePageTitle,

    kind:
      source.kind,

    blocks:
      cloneBlocks(blocks),

    role:
      resolvePhysicalPageRole(
        blocks,
      ),
  };
}

async function measureBlocks({
  measure,
  source,
  blocks,
  reason,
}: {
  measure:
    PhysicalLayoutMeasureCandidate;

  source:
    PhysicalLayoutLogicalPage;

  blocks:
    LogicalReportBlock[];

  reason:
    string;
}) {
  const candidate =
    buildCandidate({
      source,
      blocks,
    });

  trace(
    "MEASURE_REQUEST",
    {
      logicalPageId:
        source.sourcePageId,

      logicalPageTitle:
        source.sourcePageTitle,

      reason,

      role:
        candidate.role,

      blockCount:
        blocks.length,

      blocks:
        describeBlocks(blocks),
    },
  );

  const measurement =
    await measure(
      candidate,
    );

  trace(
    "MEASURE_RESULT",
    {
      logicalPageId:
        source.sourcePageId,

      reason,

      role:
        candidate.role,

      ...describeMeasurement(
        measurement,
      ),

      blocks:
        describeBlocks(blocks),
    },
  );

  return measurement;
}

function createDraftPage({
  source,
  blocks,
  measurement,
  reason,
}: {
  source:
    PhysicalLayoutLogicalPage;

  blocks:
    LogicalReportBlock[];

  measurement:
    PhysicalLayoutMeasurement;

  reason:
    string;
}): DraftPhysicalPage {
  trace(
    "DRAFT_PAGE_CREATED",
    {
      logicalPageId:
        source.sourcePageId,

      reason,

      role:
        resolvePhysicalPageRole(
          blocks,
        ),

      measurement:
        describeMeasurement(
          measurement,
        ),

      blocks:
        describeBlocks(blocks),
    },
  );

  return {
    sourceLogicalPageId:
      source.sourcePageId,

    sourcePageTitle:
      source.sourcePageTitle,

    kind:
      source.kind,

    blocks:
      cloneBlocks(blocks),

    measurement,
  };
}

async function remeasureDraftPage({
  page,
  source,
  measure,
  reason,
}: {
  page:
    DraftPhysicalPage;

  source:
    PhysicalLayoutLogicalPage;

  measure:
    PhysicalLayoutMeasureCandidate;

  reason:
    string;
}) {
  trace(
    "PAGE_REMEASURE_REQUIRED",
    {
      logicalPageId:
        source.sourcePageId,

      reason,

      blocks:
        describeBlocks(
          page.blocks,
        ),
    },
  );

  page.measurement =
    await measureBlocks({
      measure,
      source,
      blocks:
        page.blocks,
      reason,
    });
}

function getLastDraftPage(
  pages: DraftPhysicalPage[],
) {
  return pages.length > 0
    ? pages[
        pages.length - 1
      ]
    : null;
}

function findLastEvidenceLocation(
  pages: DraftPhysicalPage[],
) {
  for (
    let pageIndex =
      pages.length - 1;
    pageIndex >= 0;
    pageIndex -= 1
  ) {
    const page =
      pages[
        pageIndex
      ];

    for (
      let blockIndex =
        page.blocks.length - 1;
      blockIndex >= 0;
      blockIndex -= 1
    ) {
      const block =
        page.blocks[
          blockIndex
        ];

      if (
        !isPhysicalEvidenceBlock(
          block,
        )
      ) {
        continue;
      }

      trace(
        "EVIDENCE_COMPANION_FOUND",
        {
          pageIndex,

          blockIndex,

          block:
            describeBlock(
              block,
            ),
        },
      );

      return {
        pageIndex,
        blockIndex,
        block,
      };
    }
  }

  trace(
    "EVIDENCE_COMPANION_NOT_FOUND",
  );

  return null;
}

async function pullEvidenceCompanion({
  pages,
  source,
  measure,
}: {
  pages:
    DraftPhysicalPage[];

  source:
    PhysicalLayoutLogicalPage;

  measure:
    PhysicalLayoutMeasureCandidate;
}) {
  const location =
    findLastEvidenceLocation(
      pages,
    );

  if (!location) {
    trace(
      "DECISION",
      {
        action:
          "no-evidence-to-move-with-signature",

        reason:
          "no-evidence-location-found",
      },
    );

    return null;
  }

  const sourcePage =
    pages[
      location.pageIndex
    ];

  const [
    evidenceBlock,
  ] =
    sourcePage.blocks.splice(
      location.blockIndex,
      1,
    );

  if (!evidenceBlock) {
    trace(
      "DECISION",
      {
        action:
          "evidence-move-failed",

        reason:
          "splice-returned-empty",
      },
    );

    return null;
  }

  trace(
    "DECISION",
    {
      action:
        "evidence-moved-from-existing-page",

      reason:
        "signature-needs-companion",

      fromDraftPageIndex:
        location.pageIndex,

      evidence:
        describeBlock(
          evidenceBlock,
        ),

      remainingBlocks:
        describeBlocks(
          sourcePage.blocks,
        ),
    },
  );

  if (
    sourcePage.blocks.length ===
    0
  ) {
    pages.splice(
      location.pageIndex,
      1,
    );

    trace(
      "DECISION",
      {
        action:
          "empty-source-page-removed",

        reason:
          "all-blocks-moved-out",

        removedDraftPageIndex:
          location.pageIndex,
      },
    );
  } else {
    await remeasureDraftPage({
      page:
        sourcePage,

      source,

      measure,

      reason:
        "remeasure-after-evidence-moved-to-signature-page",
    });
  }

  return evidenceBlock;
}

/**
 * ============================================================
 * A. REGULAR CONTENT
 * ============================================================
 */

async function packRegularContent({
  source,
  measure,
}: {
  source:
    PhysicalLayoutLogicalPage;

  measure:
    PhysicalLayoutMeasureCandidate;
}) {
  trace(
    "PHASE_START",
    {
      phase:
        "REGULAR_CONTENT",

      logicalPageId:
        source.sourcePageId,

      fixedBlocks:
        describeBlocks(
          source.fixedBlocks,
        ),

      regularBlocks:
        describeBlocks(
          source.regularBlocks,
        ),
    },
  );

  const pages:
    DraftPhysicalPage[] =
      [];

  let currentBlocks:
    LogicalReportBlock[] = [
      ...source.fixedBlocks,
    ];

  let currentMeasurement:
    PhysicalLayoutMeasurement | null =
      null;

  for (
    const block of
      source.regularBlocks
  ) {
    const candidateBlocks = [
      ...currentBlocks,
      block,
    ];

    const candidateMeasurement =
      await measureBlocks({
        measure,
        source,

        blocks:
          candidateBlocks,

        reason:
          "try-regular-block-on-current-page",
      });

    if (
      candidateMeasurement.fits
    ) {
      trace(
        "DECISION",
        {
          action:
            "regular-block-kept-on-current-page",

          reason:
            "measurement-fits",

          block:
            describeBlock(
              block,
            ),

          measurement:
            describeMeasurement(
              candidateMeasurement,
            ),
        },
      );

      currentBlocks =
        candidateBlocks;

      currentMeasurement =
        candidateMeasurement;

      continue;
    }

    const hasRegularContent =
      currentBlocks.length >
      source.fixedBlocks.length;

    if (
      !hasRegularContent
    ) {
      trace(
        "DECISION",
        {
          action:
            "oversized-regular-block-forced-on-current-page",

          reason:
            "no-previous-regular-content-to-close",

          block:
            describeBlock(
              block,
            ),

          measurement:
            describeMeasurement(
              candidateMeasurement,
            ),
        },
      );

      currentBlocks =
        candidateBlocks;

      currentMeasurement =
        candidateMeasurement;

      continue;
    }

    trace(
      "DECISION",
      {
        action:
          "regular-content-page-closed",

        reason:
          "next-regular-block-does-not-fit",

        rejectedBlock:
          describeBlock(
            block,
          ),

        measurement:
          describeMeasurement(
            candidateMeasurement,
          ),
      },
    );

    const finishedMeasurement =
      currentMeasurement ||
      await measureBlocks({
        measure,
        source,

        blocks:
          currentBlocks,

        reason:
          "finalize-current-regular-page",
      });

    pages.push(
      createDraftPage({
        source,

        blocks:
          currentBlocks,

        measurement:
          finishedMeasurement,

        reason:
          "regular-content-page-finalized",
      }),
    );

    currentBlocks = [
      block,
    ];

    currentMeasurement =
      await measureBlocks({
        measure,
        source,

        blocks:
          currentBlocks,

        reason:
          "start-next-regular-page-with-rejected-block",
      });

    trace(
      "DECISION",
      {
        action:
          "regular-block-started-new-page",

        reason:
          "previous-page-overflow",

        block:
          describeBlock(
            block,
          ),

        measurement:
          describeMeasurement(
            currentMeasurement,
          ),
      },
    );
  }

  if (
    currentBlocks.length >
    0
  ) {
    const measurement =
      currentMeasurement ||
      await measureBlocks({
        measure,
        source,

        blocks:
          currentBlocks,

        reason:
          "finalize-last-regular-page",
      });

    pages.push(
      createDraftPage({
        source,

        blocks:
          currentBlocks,

        measurement,

        reason:
          "last-regular-page-finalized",
      }),
    );
  }

  trace(
    "PHASE_END",
    {
      phase:
        "REGULAR_CONTENT",

      draftPages:
        pages.length,
    },
  );

  return pages;
}

/**
 * ============================================================
 * B. EVIDENCE
 * ============================================================
 */

async function packEvidence({
  source,
  measure,
  pages,
}: {
  source:
    PhysicalLayoutLogicalPage;

  measure:
    PhysicalLayoutMeasureCandidate;

  pages:
    DraftPhysicalPage[];
}) {
  trace(
    "PHASE_START",
    {
      phase:
        "EVIDENCE",

      evidenceCount:
        source.evidenceBlocks.length,

      existingDraftPages:
        pages.length,

      evidence:
        describeBlocks(
          source.evidenceBlocks,
        ),
    },
  );

  const remainingEvidence = [
    ...source.evidenceBlocks,
  ];

  while (
    remainingEvidence.length >
    0
  ) {
    const lastPage =
      getLastDraftPage(
        pages,
      );

    if (!lastPage) {
      trace(
        "DECISION",
        {
          action:
            "cannot-append-evidence-to-existing-page",

          reason:
            "no-existing-draft-page",
        },
      );

      break;
    }

    const nextEvidence =
      remainingEvidence[0];

    const candidateBlocks = [
      ...lastPage.blocks,
      nextEvidence,
    ];

    const measurement =
      await measureBlocks({
        measure,
        source,

        blocks:
          candidateBlocks,

        reason:
          "try-evidence-on-last-existing-page",
      });

    if (
      !measurement.fits
    ) {
      trace(
        "DECISION",
        {
          action:
            "evidence-rejected-from-last-page",

          reason:
            "measurement-did-not-fit",

          evidence:
            describeBlock(
              nextEvidence,
            ),

          measurement:
            describeMeasurement(
              measurement,
            ),

          existingPageBlocks:
            describeBlocks(
              lastPage.blocks,
            ),
        },
      );

      break;
    }

    lastPage.blocks =
      candidateBlocks;

    lastPage.measurement =
      measurement;

    remainingEvidence.shift();

    trace(
      "DECISION",
      {
        action:
          "evidence-kept-on-last-page",

        reason:
          "measurement-fits",

        evidence:
          describeBlock(
            nextEvidence,
          ),

        measurement:
          describeMeasurement(
            measurement,
          ),

        remainingEvidence:
          remainingEvidence.length,
      },
    );
  }

  let currentBlocks:
    LogicalReportBlock[] =
      [];

  let currentMeasurement:
    PhysicalLayoutMeasurement | null =
      null;

  for (
    const evidenceBlock of
      remainingEvidence
  ) {
    const candidateBlocks = [
      ...currentBlocks,
      evidenceBlock,
    ];

    const measurement =
      await measureBlocks({
        measure,
        source,

        blocks:
          candidateBlocks,

        reason:
          currentBlocks.length
            ? "try-add-evidence-to-evidence-page"
            : "try-start-new-evidence-page",
      });

    if (
      measurement.fits
    ) {
      currentBlocks =
        candidateBlocks;

      currentMeasurement =
        measurement;

      trace(
        "DECISION",
        {
          action:
            currentBlocks.length ===
            1
              ? "evidence-page-started"
              : "evidence-added-to-evidence-page",

          reason:
            "measurement-fits",

          evidence:
            describeBlock(
              evidenceBlock,
            ),

          measurement:
            describeMeasurement(
              measurement,
            ),
        },
      );

      continue;
    }

    if (
      currentBlocks.length ===
      0
    ) {
      currentBlocks = [
        evidenceBlock,
      ];

      currentMeasurement =
        measurement;

      trace(
        "DECISION",
        {
          action:
            "oversized-evidence-forced-to-own-page",

          reason:
            "evidence-never-drops",

          evidence:
            describeBlock(
              evidenceBlock,
            ),

          measurement:
            describeMeasurement(
              measurement,
            ),
        },
      );

      continue;
    }

    trace(
      "DECISION",
      {
        action:
          "current-evidence-page-closed",

        reason:
          "next-evidence-does-not-fit",

        rejectedEvidence:
          describeBlock(
            evidenceBlock,
          ),

        measurement:
          describeMeasurement(
            measurement,
          ),
      },
    );

    pages.push(
      createDraftPage({
        source,

        blocks:
          currentBlocks,

        measurement:
          currentMeasurement ||
          await measureBlocks({
            measure,
            source,

            blocks:
              currentBlocks,

            reason:
              "finalize-evidence-page",
          }),

        reason:
          "evidence-page-finalized",
      }),
    );

    currentBlocks = [
      evidenceBlock,
    ];

    currentMeasurement =
      await measureBlocks({
        measure,
        source,

        blocks:
          currentBlocks,

        reason:
          "start-next-evidence-page-with-rejected-evidence",
      });
  }

  if (
    currentBlocks.length >
    0
  ) {
    pages.push(
      createDraftPage({
        source,

        blocks:
          currentBlocks,

        measurement:
          currentMeasurement ||
          await measureBlocks({
            measure,
            source,

            blocks:
              currentBlocks,

            reason:
              "finalize-last-evidence-page",
          }),

        reason:
          "last-evidence-page-finalized",
      }),
    );
  }

  trace(
    "PHASE_END",
    {
      phase:
        "EVIDENCE",

      draftPages:
        pages.length,
    },
  );
}

/**
 * ============================================================
 * C. SIGNATURE
 * ============================================================
 */

async function placeSignature({
  source,
  measure,
  pages,
  policy,
}: {
  source:
    PhysicalLayoutLogicalPage;

  measure:
    PhysicalLayoutMeasureCandidate;

  pages:
    DraftPhysicalPage[];

  policy:
    PhysicalLayoutPolicy;
}) {
  const signatureBlocks = [
    ...source.signatureBlocks,
  ];

  trace(
    "PHASE_START",
    {
      phase:
        "SIGNATURE",

      signatureCount:
        signatureBlocks.length,

      signatures:
        describeBlocks(
          signatureBlocks,
        ),

      currentDraftPages:
        pages.length,
    },
  );

  if (
    signatureBlocks.length ===
    0
  ) {
    trace(
      "DECISION",
      {
        action:
          "signature-phase-skipped",

        reason:
          "no-signature-blocks",
      },
    );

    return;
  }

  const lastPage =
    getLastDraftPage(
      pages,
    );

  if (lastPage) {
    const candidateBlocks = [
      ...lastPage.blocks,
      ...signatureBlocks,
    ];

    const measurement =
      await measureBlocks({
        measure,
        source,

        blocks:
          candidateBlocks,

        reason:
          "try-signature-on-last-existing-page",
      });

    if (
      measurement.fits
    ) {
      lastPage.blocks =
        candidateBlocks;

      lastPage.measurement =
        measurement;

      trace(
        "DECISION",
        {
          action:
            "signature-kept-on-last-page",

          reason:
            "measurement-fits",

          measurement:
            describeMeasurement(
              measurement,
            ),

          finalBlocks:
            describeBlocks(
              candidateBlocks,
            ),
        },
      );

      trace(
        "PHASE_END",
        {
          phase:
            "SIGNATURE",

          result:
            "same-page",
        },
      );

      return;
    }

    trace(
      "DECISION",
      {
        action:
          "signature-rejected-from-last-page",

        reason:
          "measurement-did-not-fit",

        measurement:
          describeMeasurement(
            measurement,
        ),

        lastPageBlocks:
          describeBlocks(
            lastPage.blocks,
          ),

        signatureBlocks:
          describeBlocks(
            signatureBlocks,
          ),
      },
    );
  } else {
    trace(
      "DECISION",
      {
        action:
          "signature-cannot-use-existing-page",

        reason:
          "no-existing-draft-page",
      },
    );
  }

  const evidenceLocation =
    findLastEvidenceLocation(
      pages,
    );

  const hasAvailableEvidence =
    Boolean(
      evidenceLocation,
    );

  const shouldPullEvidence =
    shouldKeepEvidenceWithSignature({
      policy,

      hasSignature:
        true,

      hasAvailableEvidence,

      signatureNeedsOwnPage:
        true,
    });

  trace(
    "DECISION",
    {
      action:
        "evaluate-signature-companion-policy",

      signatureNeedsOwnPage:
        true,

      hasAvailableEvidence,

      keepEvidenceWithLonelySignature:
        policy.keepEvidenceWithLonelySignature,

      shouldPullEvidence,
    },
  );

  let companionEvidence:
    LogicalReportBlock | null =
      null;

  if (
    shouldPullEvidence
  ) {
    companionEvidence =
      await pullEvidenceCompanion({
        pages,
        source,
        measure,
      });

    trace(
      "DECISION",
      {
        action:
          companionEvidence
            ? "evidence-selected-as-signature-companion"
            : "signature-page-has-no-companion-after-attempt",

        companionEvidence:
          companionEvidence
            ? describeBlock(
                companionEvidence,
              )
            : null,
      },
    );
  }

  const signaturePageBlocks =
    companionEvidence
      ? [
          companionEvidence,
          ...signatureBlocks,
        ]
      : [
          ...signatureBlocks,
        ];

  const measurement =
    await measureBlocks({
      measure,
      source,

      blocks:
        signaturePageBlocks,

      reason:
        companionEvidence
          ? "measure-new-evidence-signature-page"
          : "measure-new-signature-page",
    });

  trace(
    "DECISION",
    {
      action:
        companionEvidence
          ? "create-evidence-signature-page"
          : "create-signature-page",

      reason:
        lastPage
          ? "signature-did-not-fit-on-last-page"
          : "no-existing-page-for-signature",

      measurement:
        describeMeasurement(
          measurement,
        ),

      blocks:
        describeBlocks(
          signaturePageBlocks,
        ),
    },
  );

  if (
    !measurement.fits
  ) {
    trace(
      "WARNING",
      {
        action:
          "signature-page-created-despite-overflow",

        reason:
          "signature-never-drops",

        measurement:
          describeMeasurement(
            measurement,
        ),
      },
    );
  }

  pages.push(
    createDraftPage({
      source,

      blocks:
        signaturePageBlocks,

      measurement,

      reason:
        companionEvidence
          ? "new-evidence-signature-page"
          : "new-signature-page",
    }),
  );

  trace(
    "PHASE_END",
    {
      phase:
        "SIGNATURE",

      result:
        companionEvidence
          ? "new-page-with-evidence"
          : "new-signature-page",
    },
  );
}

function createFinalPage({
  draft,
  physicalPageIndex,
  physicalIndexWithinLogicalPage,
}: {
  draft:
    DraftPhysicalPage;

  physicalPageIndex:
    number;

  physicalIndexWithinLogicalPage:
    number;
}): PhysicalLayoutPage {
  const role =
    resolvePhysicalPageRole(
      draft.blocks,
    );

  const finalPage:
    PhysicalLayoutPage = {
    id:
      `physical-${physicalPageIndex + 1}`,

    title:
      physicalIndexWithinLogicalPage ===
      1
        ? draft.sourcePageTitle
        : `${draft.sourcePageTitle} - صفحة ${physicalIndexWithinLogicalPage}`,

    kind:
      draft.kind,

    role,

    blocks:
      cloneBlocks(
        draft.blocks,
      ),

    sourceLogicalPageId:
      draft.sourceLogicalPageId,

    sourcePageIds: [
      draft.sourceLogicalPageId,
    ],

    physicalPageIndex,

    physicalIndexWithinLogicalPage,

    containsEvidence:
      role ===
        "evidence" ||
      role ===
        "content-evidence" ||
      role ===
        "evidence-signature",

    containsSignature:
      role ===
        "signature" ||
      role ===
        "evidence-signature",

    frozenLayout:
      toFrozenSettings(
        draft.measurement,
      ),
  };

  trace(
    "FINAL_PAGE",
    {
      id:
        finalPage.id,

      sourceLogicalPageId:
        finalPage.sourceLogicalPageId,

      physicalPageIndex:
        finalPage.physicalPageIndex,

      physicalIndexWithinLogicalPage:
        finalPage.physicalIndexWithinLogicalPage,

      role:
        finalPage.role,

      containsEvidence:
        finalPage.containsEvidence,

      containsSignature:
        finalPage.containsSignature,

      frozenLayout:
        finalPage.frozenLayout,

      blocks:
        describeBlocks(
          finalPage.blocks,
        ),
    },
  );

  return finalPage;
}

export async function buildPhysicalLayoutPlan({
  logicalPages,
  measure,
  policy =
    DEFAULT_PHYSICAL_LAYOUT_POLICY,
}: {
  logicalPages:
    PhysicalLayoutLogicalPage[];

  measure:
    PhysicalLayoutMeasureCandidate;

  policy?:
    PhysicalLayoutPolicy;
}): Promise<PhysicalLayoutPlan> {
  traceSequence = 0;

  trace(
    "PLAN_START",
    {
      logicalPageCount:
        logicalPages.length,

      policy,
    },
  );

  const result:
    PhysicalLayoutPage[] =
      [];

  for (
    const logicalPage of
      logicalPages
  ) {
    trace(
      "LOGICAL_PAGE_START",
      {
        id:
          logicalPage.sourcePageId,

        title:
          logicalPage.sourcePageTitle,

        kind:
          logicalPage.kind,

        fixedCount:
          logicalPage.fixedBlocks.length,

        contentCount:
          logicalPage.regularBlocks.length,

        evidenceCount:
          logicalPage.evidenceBlocks.length,

        signatureCount:
          logicalPage.signatureBlocks.length,
      },
    );

    const draftPages =
      await packRegularContent({
        source:
          logicalPage,

        measure,
      });

    await packEvidence({
      source:
        logicalPage,

      measure,

      pages:
        draftPages,
    });

    await placeSignature({
      source:
        logicalPage,

      measure,

      pages:
        draftPages,

      policy,
    });

    trace(
      "LOGICAL_PAGE_DRAFT_COMPLETE",
      {
        logicalPageId:
          logicalPage.sourcePageId,

        draftPageCount:
          draftPages.length,

        draftPages:
          draftPages.map(
            (
              page,
              index,
            ) => ({
              index,

              role:
                resolvePhysicalPageRole(
                  page.blocks,
                ),

              measurement:
                describeMeasurement(
                  page.measurement,
                ),

              blocks:
                describeBlocks(
                  page.blocks,
                ),
            }),
          ),
      },
    );

    let logicalPhysicalIndex =
      1;

    for (
      const draft of
        draftPages
    ) {
      if (
        draft.blocks.length ===
        0
      ) {
        trace(
          "DECISION",
          {
            action:
              "empty-draft-page-skipped",

            logicalPageId:
              logicalPage.sourcePageId,
          },
        );

        continue;
      }

      result.push(
        createFinalPage({
          draft,

          physicalPageIndex:
            result.length,

          physicalIndexWithinLogicalPage:
            logicalPhysicalIndex,
        }),
      );

      logicalPhysicalIndex +=
        1;
    }

    trace(
      "LOGICAL_PAGE_END",
      {
        id:
          logicalPage.sourcePageId,

        totalPhysicalPagesSoFar:
          result.length,
      },
    );
  }

  const normalizedPages =
    result.map(
      (
        page,
        index,
      ) => ({
        ...page,

        id:
          `physical-${index + 1}`,

        physicalPageIndex:
          index,

        blocks:
          cloneBlocks(
            page.blocks,
          ),

        sourcePageIds: [
          page.sourceLogicalPageId,
        ],

        frozenLayout:
          page.frozenLayout
            ? {
                ...page.frozenLayout,
              }
            : undefined,
      }),
    );

  const fingerprint =
    createSemanticInputFingerprint(
      normalizedPages.map(
        (page) => ({
          id:
            page.id,

          sourceLogicalPageId:
            page.sourceLogicalPageId,

          role:
            page.role,

          physicalIndexWithinLogicalPage:
            page.physicalIndexWithinLogicalPage,

          blocks:
            page.blocks.map(
              (block) => ({
                id:
                  block?.id,

                kind:
                  block?.kind,
              }),
            ),

          frozenLayout:
            page.frozenLayout,
        }),
      ),
    );

  trace(
    "PLAN_COMPLETE",
    {
      physicalPageCount:
        normalizedPages.length,

      fingerprint,

      pages:
        normalizedPages.map(
          (page) => ({
            id:
              page.id,

            sourceLogicalPageId:
              page.sourceLogicalPageId,

            role:
              page.role,

            containsEvidence:
              page.containsEvidence,

            containsSignature:
              page.containsSignature,

            frozenLayout:
              page.frozenLayout,

            blocks:
              describeBlocks(
                page.blocks,
              ),
          }),
        ),
    },
  );

  return Object.freeze({
    pages:
      Object.freeze(
        normalizedPages.map(
          (page) =>
            Object.freeze({
              ...page,

              blocks:
                Object.freeze(
                  [
                    ...page.blocks,
                  ],
                ) as unknown as LogicalReportBlock[],

              sourcePageIds:
                Object.freeze(
                  [
                    ...page.sourcePageIds,
                  ],
                ) as unknown as string[],

              frozenLayout:
                page.frozenLayout
                  ? Object.freeze({
                      ...page.frozenLayout,
                    })
                  : undefined,
            }),
        ),
      ) as unknown as PhysicalLayoutPage[],

    fingerprint,

    frozen:
      true as const,
  });
}