"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReportDesignId } from "../report-design-types";
import { A4DesignPage } from "../shared/report-blocks";
import type { PreviewCaseData } from "../shared/report-types";
import { splitOversizedReportBlock } from "./report-smart-block-pagination";
import { SmartReportPageComposer } from "./report-smart-page-composer";
import {
  createSemanticInputFingerprint,
  getFingerprintPrefix,
  ReportSmartSemanticFingerprintProvider,
  roundLayoutMetric,
} from "./report-smart-lifecycle";
import {
  mergeAdjacentCommitteeItemsTableBlocks,
  paginateStructuredTableBlock,
  type LogicalReportBlock,
} from "./report-smart-table-pagination";
import type {
  ReportPhysicalPageComposition,
  ReportPhysicalPageModel,
  ReportTwoPhysicalNavigationItem,
} from "./report-smart-physical-types";

type LogicalPage = {
  id?: string;
  title?: string;
  kind?: string;
  blocks?: LogicalReportBlock[];
  [key: string]: any;
};

type PhysicalPage = ReportPhysicalPageModel;

type SmartPhysicalReportComposerProps = {
  designId: ReportDesignId;
  pages: LogicalPage[];
  activePageId?: string;
  activePhysicalPageId?: string;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  fallbackPageLabel?: string;
  renderMode?: "single" | "stack";
  suppressAutoEvidencePages?: boolean;
  onPhysicalPagesChange?: (
    pages: ReportTwoPhysicalNavigationItem[],
  ) => void;
};

type PhysicalPlanningPhase =
  | "DIRTY"
  | "PLANNING"
  | "MEASURING"
  | "STABILIZING"
  | "READY"
  | "FROZEN";

type PhysicalInvalidationReason =
  | "initial"
  | "design-change"
  | "page-structure-change"
  | "content-change"
  | "evidence-change"
  | "signature-change"
  | "header-settings-change";

const MAX_PHYSICAL_STABILIZATION_ATTEMPTS = 80;

type FlowItem = {
  block: LogicalReportBlock;
  sourcePageId: string;
  sourcePageTitle: string;
};

type LogicalPageModel = {
  sourcePageId: string;
  sourcePageTitle: string;
  kind: string;
  regularItems: FlowItem[];
  signatureItems: FlowItem[];
  evidenceItems: FlowItem[];
  fixedBlocks: LogicalReportBlock[];
};

function normalizePlacement(block: LogicalReportBlock) {
  return String(block?.placement || "flow").trim() || "flow";
}

function isVisibleBlock(block: LogicalReportBlock) {
  return Boolean(block) && block.visible !== false;
}

function isEvidenceBlock(block: LogicalReportBlock) {
  return String(block?.kind || "").trim() === "evidence-gallery";
}

function isSignatureBlock(block: LogicalReportBlock) {
  const kind = String(block?.kind || "").trim();
  const smartKind = String(
    block?.settings?.smartBlockKind || "",
  ).trim();
  const title = String(block?.title || "").trim();

  return (
    kind === "signature-grid" ||
    kind === "signatures" ||
    kind === "approval-signatures" ||
    smartKind === "signature-grid" ||
    smartKind === "signatures" ||
    title.includes("توقيع") ||
    title.includes("اعتماد") ||
    Array.isArray(block?.signatures)
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

/** Normalize deterministic physical identities without discarding content. */
function canonicalizePhysicalPages(pages: readonly PhysicalPage[]) {
  return pages.map((page, index) => {
    const id = `smart-physical-${index + 1}`;

    return {
      ...page,
      id,
      corePhysicalPageId: id,
      physicalPageRole: "primary" as const,
      blocks: [...page.blocks],
      sourcePageIds: uniqueStrings(page.sourcePageIds),
    };
  });
}

function buildLogicalPageModels(pages: LogicalPage[]): LogicalPageModel[] {
  const sourcePages = pages.length > 0
    ? pages
    : [{
        id: "logical-page-1",
        title: "التقرير",
        kind: "content",
        blocks: [],
      }];

  return sourcePages.map((page, pageIndex) => {
    const regularItems: FlowItem[] = [];
    const signatureItems: FlowItem[] = [];
    const evidenceItems: FlowItem[] = [];
    const sourcePageId =
      String(page?.id || `logical-page-${pageIndex + 1}`);

    const sourcePageTitle =
      String(page?.title || `صفحة ${pageIndex + 1}`);

    const blocks = Array.isArray(page?.blocks)
      ? page.blocks.filter(isVisibleBlock)
      : [];

    const fixedBlocks = blocks.filter(
      (block) =>
        normalizePlacement(block) !== "flow" &&
        !isSignatureBlock(block),
    );

    blocks
      .filter(
        (block) =>
          normalizePlacement(block) === "flow" ||
          isSignatureBlock(block),
      )
      .flatMap((block) => paginateStructuredTableBlock(block))
      .forEach((block) => {
        const item: FlowItem = {
          block,
          sourcePageId,
          sourcePageTitle,
        };

        if (isSignatureBlock(block)) {
          signatureItems.push(item);
          return;
        }

        if (isEvidenceBlock(block)) {
          evidenceItems.push(item);
          return;
        }

        regularItems.push(item);
      });
    return {
      sourcePageId,
      sourcePageTitle,
      kind: String(page?.kind || "content"),
      regularItems,
      signatureItems,
      evidenceItems,
      fixedBlocks,
    };
  });
}

function buildSemanticInputFingerprint(
  designId: ReportDesignId,
  pages: LogicalPage[],
  context: Record<string, string>,
  previewCase: PreviewCaseData | null,
  fallbackPageLabel: string,
  suppressAutoEvidencePages: boolean,
) {
  return createSemanticInputFingerprint({
    designId,
    fallbackPageLabel,
    suppressAutoEvidencePages,
    context,
    pages,
    previewCase,
  });
}

function makePhysicalPage(
  index: number,
  logicalPage: LogicalPageModel,
  blocks: LogicalReportBlock[],
): PhysicalPage {
  return {
    id: `smart-physical-${index + 1}`,
    title: logicalPage.sourcePageTitle,
    kind: logicalPage.kind,
    blocks: mergeAdjacentCommitteeItemsTableBlocks(blocks),
    sourcePageIds: [logicalPage.sourcePageId],
    corePhysicalPageId: `smart-physical-${index + 1}`,
    physicalPageRole: "primary",
  };
}

function addLogicalPageFixedBlocks(
  physicalPage: PhysicalPage,
  logicalPage: LogicalPageModel,
  includeFixedBlocks: boolean,
) {
  if (!includeFixedBlocks || !logicalPage.fixedBlocks.length) {
    return physicalPage;
  }

  return {
    ...physicalPage,
    blocks: [
      ...physicalPage.blocks,
      ...logicalPage.fixedBlocks,
    ],
  };
}

function appendLogicalPageSpecialBlocks(
  pages: PhysicalPage[],
  logicalPage: LogicalPageModel,
) {
  const result =
    pages.length > 0
      ? pages.map((page) => ({
          ...page,
          blocks: [...page.blocks],
          sourcePageIds: [...page.sourcePageIds],
        }))
      : [
          {
            id: "smart-physical-1",
            title: logicalPage.sourcePageTitle,
            kind: logicalPage.kind,
            blocks: [...logicalPage.fixedBlocks],
            sourcePageIds: [logicalPage.sourcePageId],
            corePhysicalPageId: "smart-physical-1",
            physicalPageRole: "primary",
          } satisfies PhysicalPage,
        ];

  const lastIndex = result.length - 1;
  const last = result[lastIndex];

  /*
   * Evidence is intentionally placed BEFORE signature.
   *
   * SmartReportPageComposer then decides:
   * 2 evidence / 1 evidence / 0 evidence on this page,
   * while the remaining evidence goes to AutoEvidencePages.
   */
  const primaryEvidenceItem = logicalPage.evidenceItems.find(
    (item) => Number(item.block?.evidenceStartIndex || 0) <= 0,
  ) || logicalPage.evidenceItems[0];
  const evidenceBlocks = primaryEvidenceItem
    ? [primaryEvidenceItem.block]
    : [];
  const evidenceContinuationItems = logicalPage.evidenceItems.filter(
    (item) => item !== primaryEvidenceItem,
  );

  const signatureBlocks =
    logicalPage.signatureItems.map((item) => item.block);

  result[lastIndex] = {
    ...last,
    sourcePageIds: [logicalPage.sourcePageId],
    blocks: [
      ...last.blocks,
      ...evidenceBlocks,
      ...signatureBlocks,
    ],
  };

  evidenceContinuationItems.forEach((item) => {
    result.push(
      makePhysicalPage(
        result.length,
        logicalPage,
        [item.block],
      ),
    );
  });

  return result;
}

function buildComposedPhysicalPages(
  corePages: readonly PhysicalPage[],
  compositions: Readonly<Record<string, ReportPhysicalPageComposition>>,
  logicalPages: readonly LogicalPageModel[],
) {
  const logicalTitles = new Map(
    logicalPages.map((page) => [page.sourcePageId, page.sourcePageTitle]),
  );
  const logicalPageCounters = new Map<string, number>();
  const seenPhysicalIds = new Set<string>();

  return corePages.flatMap((corePage) => {
    const composedPages =
      compositions[corePage.id]?.pages?.length
        ? compositions[corePage.id].pages
        : [corePage];

    return composedPages.flatMap((page) => {
      const id = String(page.id || "").trim();

      if (!id || seenPhysicalIds.has(id)) {
        return [];
      }

      seenPhysicalIds.add(id);
      const sourcePageIds = uniqueStrings(
        page.sourcePageIds.length
          ? page.sourcePageIds
          : corePage.sourcePageIds,
      );
      const sourceLogicalPageId = sourcePageIds[0] || "logical-page-1";
      const physicalIndexWithinLogicalPage =
        (logicalPageCounters.get(sourceLogicalPageId) || 0) + 1;
      logicalPageCounters.set(
        sourceLogicalPageId,
        physicalIndexWithinLogicalPage,
      );
      const sourceTitle =
        logicalTitles.get(sourceLogicalPageId) || corePage.title || "التقرير";
      const title =
        physicalIndexWithinLogicalPage === 1
          ? sourceTitle
          : `${sourceTitle} - صفحة ${physicalIndexWithinLogicalPage}`;

      return [{
        ...page,
        title,
        sourcePageIds,
        corePhysicalPageId: corePage.id,
        physicalPageIndex: seenPhysicalIds.size - 1,
        physicalIndexWithinLogicalPage,
      }];
    });
  });
}

function buildPhysicalNavigationItems(
  pages: readonly PhysicalPage[],
): ReportTwoPhysicalNavigationItem[] {
  return pages.map((page, index) => ({
    physicalPageId: page.id,
    corePhysicalPageId: page.corePhysicalPageId,
    sourceLogicalPageId: page.sourcePageIds[0] || "logical-page-1",
    sourcePageIds: [...page.sourcePageIds],
    label: page.title,
    physicalPageIndex: index,
    physicalIndexWithinLogicalPage:
      page.physicalIndexWithinLogicalPage || 1,
    role: page.physicalPageRole,
  }));
}

export function SmartPhysicalReportComposer({
  designId,
  pages,
  activePageId,
  activePhysicalPageId,
  context,
  previewCase,
  fallbackPageLabel = "التقرير",
  renderMode = "stack",
  suppressAutoEvidencePages = false,
  onPhysicalPagesChange,
}: SmartPhysicalReportComposerProps) {
  const logicalPageModels = useMemo(
    () => buildLogicalPageModels(pages || []),
    [pages],
  );

  const semanticInputFingerprint = useMemo(
    () =>
      buildSemanticInputFingerprint(
        designId,
        pages || [],
        context,
        previewCase,
        fallbackPageLabel,
        suppressAutoEvidencePages,
      ),
    [
      context,
      designId,
      fallbackPageLabel,
      pages,
      previewCase,
      suppressAutoEvidencePages,
    ],
  );

  const semanticFingerprintParts = useMemo(
    () => ({
      content: semanticInputFingerprint,
      design: createSemanticInputFingerprint(designId),
      evidence: createSemanticInputFingerprint({
        blocks: pages.flatMap((page) =>
          (page.blocks || []).filter(isEvidenceBlock),
        ),
        evidences: previewCase?.evidences || [],
      }),
      header: createSemanticInputFingerprint({
        fallbackPageLabel,
        settings: Object.fromEntries(
          Object.entries(context).filter(([key]) =>
            key.startsWith("identity.") ||
            key.startsWith("report."),
          ),
        ),
      }),
      pageStructure: createSemanticInputFingerprint(
        pages.map((page) => ({
          blocks: (page.blocks || []).map((block) => ({
            id: block?.id,
            kind: block?.kind,
            placement: block?.placement,
          })),
          id: page.id,
          kind: page.kind,
        })),
      ),
      signatures: createSemanticInputFingerprint({
        blocks: pages.flatMap((page) =>
          (page.blocks || []).filter(isSignatureBlock),
        ),
        context: Object.fromEntries(
          Object.entries(context).filter(([key]) =>
            key.toLowerCase().includes("signature"),
          ),
        ),
      }),
    }),
    [
      context,
      designId,
      fallbackPageLabel,
      pages,
      previewCase?.evidences,
      semanticInputFingerprint,
    ],
  );

  const semanticFingerprintPartsFingerprint = useMemo(
    () => createSemanticInputFingerprint(semanticFingerprintParts),
    [semanticFingerprintParts],
  );

  const measurementHostRef =
    useRef<HTMLDivElement | null>(null);

  const outputHostRef =
    useRef<HTMLDivElement | null>(null);

  const [physicalPages, setPhysicalPages] =
    useState<PhysicalPage[]>([]);

  const [finalPhysicalPages, setFinalPhysicalPages] =
    useState<PhysicalPage[]>([]);

  const [pageCompositions, setPageCompositions] =
    useState<Record<string, ReportPhysicalPageComposition>>({});

  const [acceptedItems, setAcceptedItems] =
    useState<FlowItem[]>([]);

  const [effectiveRegularItems, setEffectiveRegularItems] =
    useState<FlowItem[]>(
      () => logicalPageModels[0]?.regularItems ?? [],
    );

  const [logicalPageIndex, setLogicalPageIndex] =
    useState(0);

  const [currentLogicalPhysicalPages, setCurrentLogicalPhysicalPages] =
    useState<PhysicalPage[]>([]);

  const [cursor, setCursor] =
    useState(0);

  const [candidateVersion, setCandidateVersion] =
    useState(0);

  const [done, setDone] =
    useState(false);

  const [planningPhase, setPlanningPhase] =
    useState<PhysicalPlanningPhase>("DIRTY");

  const [plannedResetKey, setPlannedResetKey] =
    useState(semanticInputFingerprint);

  const planningPhaseRef =
    useRef<PhysicalPlanningPhase>("DIRTY");

  const outputStabilityRef = useRef({
    signature: "",
    count: 0,
    attempts: 0,
  });

  const finalizedPlanRef = useRef<{
    semanticInputFingerprint: string;
    layoutResultFingerprint: string;
    pages: readonly PhysicalPage[];
  } | null>(null);

  const previousSemanticPartsRef =
    useRef<typeof semanticFingerprintParts | null>(null);

  const [invalidationReason, setInvalidationReason] =
    useState<PhysicalInvalidationReason>("initial");

  const fontsSettledRef = useRef(false);
  const settledAssetSourcesRef = useRef(new Set<string>());
  const outputResizeFingerprintRef = useRef("");

  const decisionLockRef =
    useRef(false);

  /*
   * New report/template data => rebuild physical pagination.
   */
  useEffect(() => {
    const currentParts = JSON.parse(
      semanticFingerprintPartsFingerprint,
    ) as typeof semanticFingerprintParts;
    const previousParts = previousSemanticPartsRef.current;

    const nextInvalidationReason: PhysicalInvalidationReason = !previousParts
      ? "initial"
      : previousParts.design !== currentParts.design
        ? "design-change"
        : previousParts.pageStructure !==
            currentParts.pageStructure
          ? "page-structure-change"
          : previousParts.evidence !== currentParts.evidence
            ? "evidence-change"
            : previousParts.signatures !==
                currentParts.signatures
              ? "signature-change"
              : previousParts.header !== currentParts.header
                ? "header-settings-change"
                : "content-change";

    setInvalidationReason(nextInvalidationReason);

    previousSemanticPartsRef.current = currentParts;
    finalizedPlanRef.current = null;
    decisionLockRef.current = false;

    planningPhaseRef.current = "DIRTY";
    setPlanningPhase("DIRTY");
    setPhysicalPages([]);
    setFinalPhysicalPages([]);
    setPageCompositions({});
    setAcceptedItems([]);
    setEffectiveRegularItems(
      logicalPageModels[0]?.regularItems ?? [],
    );
    setLogicalPageIndex(0);
    setCurrentLogicalPhysicalPages([]);
    setCursor(0);
    setCandidateVersion(
      (current) => current + 1,
    );
    setDone(false);
    planningPhaseRef.current = "PLANNING";
    setPlanningPhase("PLANNING");
    outputStabilityRef.current = {
      signature: "",
      count: 0,
      attempts: 0,
    };
    settledAssetSourcesRef.current.clear();
    outputResizeFingerprintRef.current = "";
    setPlannedResetKey(semanticInputFingerprint);
  }, [
    semanticInputFingerprint,
    semanticFingerprintPartsFingerprint,
  ]);

  const activeLogicalPage =
    logicalPageModels[logicalPageIndex] ?? logicalPageModels[0]!;

  const completeCurrentLogicalPage = useCallback(
    (corePages: PhysicalPage[]) => {
      if (!activeLogicalPage) {
        setDone(true);
        return;
      }

      const logicalPhysicalPages = corePages.length > 0
        ? corePages
        : [
            makePhysicalPage(
              physicalPages.length,
              activeLogicalPage,
              [...activeLogicalPage.fixedBlocks],
            ),
          ];

      const completedLogicalPages =
        appendLogicalPageSpecialBlocks(
          logicalPhysicalPages,
          activeLogicalPage,
        );

      setPhysicalPages(
        canonicalizePhysicalPages([
          ...physicalPages,
          ...completedLogicalPages,
        ]),
      );
      setCurrentLogicalPhysicalPages([]);
      setAcceptedItems([]);
      setCursor(0);

      if (logicalPageIndex >= logicalPageModels.length - 1) {
        setDone(true);
      } else {
        setEffectiveRegularItems(
          logicalPageModels[logicalPageIndex + 1]?.regularItems ?? [],
        );
        setLogicalPageIndex((current) => current + 1);
        setCandidateVersion((current) => current + 1);
      }
    },
    [
      activeLogicalPage,
      logicalPageIndex,
      logicalPageModels.length,
      physicalPages,
    ],
  );

  const hasRegularItems =
    effectiveRegularItems.length > 0;

  const nextItem =
    effectiveRegularItems[cursor];

  const candidateItems = useMemo(() => {
    if (done) {
      return [];
    }

    if (!hasRegularItems) {
      return [];
    }

    if (!nextItem) {
      return acceptedItems;
    }

    return [
      ...acceptedItems,
      nextItem,
    ];
  }, [
    acceptedItems,
    done,
    hasRegularItems,
    nextItem,
  ]);

  const candidateBlocks = useMemo(() => {
    if (!hasRegularItems) {
      /*
       * Signature-only report:
       * signature is the core content because there are no
       * regular blocks to pack.
       */
      const signatureBlocks = activeLogicalPage.signatureItems.map(
        (item) => item.block,
      );

      return [
        ...signatureBlocks,
        ...(currentLogicalPhysicalPages.length === 0
          ? activeLogicalPage.fixedBlocks
          : []),
      ];
    }

    /*
     * IMPORTANT:
     *
     * Physical pagination packs REGULAR CONTENT ONLY.
     *
     * Do not inject signature into the final regular candidate.
     * Doing that caused this failure:
     *
     * fields                         -> fits
     * fields + narrative + signature -> fails
     * engine closes page at fields   -> WRONG
     *
     * Now:
     *
     * fields + narrative + other regular blocks
     * are packed using the real Smart A4 measurement first.
     *
     * Evidence and signature are appended only after the core
     * physical pages have been built, and SmartReportPageComposer
     * negotiates their final placement.
     */
    return [
      ...mergeAdjacentCommitteeItemsTableBlocks(
        candidateItems.map((item) => item.block),
      ),
      ...(currentLogicalPhysicalPages.length === 0
        ? activeLogicalPage.fixedBlocks
        : []),
    ];
  }, [
    activeLogicalPage,
    candidateItems,
    currentLogicalPhysicalPages.length,
    hasRegularItems,
  ]);

  const candidatePage = useMemo(
    () => ({
      id:
        `smart-measure-${candidateVersion}-${logicalPageIndex}-${cursor}-${acceptedItems.length}`,

      title: activeLogicalPage.sourcePageTitle || fallbackPageLabel,

      kind: "content",

      blocks: candidateBlocks,
    }),
    [
      candidateVersion,
      logicalPageIndex,
      cursor,
      acceptedItems.length,
      fallbackPageLabel,
      candidateBlocks,
      activeLogicalPage.sourcePageTitle,
    ],
  );

  /*
   * Special case:
   * no regular blocks at all.
   */
  useEffect(() => {
    if (
      done ||
      hasRegularItems
    ) {
      return;
    }

    /*
     * We still render the hidden measurement candidate first
     * if signatures exist.
     */
    if (activeLogicalPage.signatureItems.length > 0) {
      return;
    }

    completeCurrentLogicalPage([]);
  }, [
    activeLogicalPage.signatureItems.length,
    completeCurrentLogicalPage,
    done,
    hasRegularItems,
  ]);

  /*
   * DOM-driven physical page packing.
   *
   * Greedy but measured:
   *
   * current accepted blocks + next block
   *              ↓
   *     real A4 Smart engine
   *              ↓
   * fits? yes => accept block
   * fits? no  => finalize previous physical page
   */
  useEffect(() => {
    const host =
      measurementHostRef.current;

    if (
      !host ||
      done
    ) {
      return;
    }

    let frame: number | null = null;

    const inspect = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      frame =
        window.requestAnimationFrame(() => {
          frame = null;

          if (decisionLockRef.current) {
            return;
          }

          const viewport =
            host.querySelector<HTMLElement>(
              ".report-smart-a4-content",
            );

          if (!viewport) {
            return;
          }

          /*
           * score=0 is the initial React state.
           * Wait until the internal Smart A4 multi-plan engine
           * has completed a real measurement.
           */
          const scoreValue =
            Number(
              viewport.getAttribute(
                "data-smart-a4-score",
              ) || "0",
            );

          const candidateId =
            viewport.getAttribute(
              "data-smart-a4-candidate",
            );

          const smartA4Phase =
            viewport.getAttribute(
              "data-smart-a4-phase",
            );

          if (
            smartA4Phase !== "FROZEN" ||
            !candidateId ||
            !Number.isFinite(scoreValue) ||
            scoreValue === 0
          ) {
            return;
          }

          const minimumSafeSelected =
            viewport.dataset.reportDensity === "minimum-safe";
          const fits =
            viewport.dataset.reportOverflow === "fit" &&
            !(minimumSafeSelected && acceptedItems.length > 0);

          decisionLockRef.current = true;

          /*
           * ---------------------------------------------------
           * NO REGULAR CONTENT, SIGNATURE-ONLY CORE PAGE
           * ---------------------------------------------------
           */
          if (!hasRegularItems) {
            completeCurrentLogicalPage([]);

            decisionLockRef.current = false;
            return;
          }

          const isLastItem =
            cursor >=
            effectiveRegularItems.length - 1;

          /*
           * Candidate fits:
           * accept next block.
           */
          if (fits) {
            const nextAccepted =
              nextItem
                ? [
                    ...acceptedItems,
                    nextItem,
                  ]
                : acceptedItems;

            if (isLastItem) {
              /*
               * Entire last REGULAR physical page fits.
               *
               * Evidence and signature placement happens only
               * after the regular packing phase completes.
               */
              const basePage =
                makePhysicalPage(
                  physicalPages.length + currentLogicalPhysicalPages.length,
                  activeLogicalPage,
                  nextAccepted.map(
                    (item) => item.block,
                  ),
                );

              const withFixed =
                addLogicalPageFixedBlocks(
                  basePage,
                  activeLogicalPage,
                  currentLogicalPhysicalPages.length === 0,
                );

              completeCurrentLogicalPage([
                ...currentLogicalPhysicalPages,
                withFixed,
              ]);

              decisionLockRef.current = false;
              return;
            }

            setAcceptedItems(
              nextAccepted,
            );

            setCursor(
              (current) =>
                current + 1,
            );

            setCandidateVersion(
              (current) =>
                current + 1,
            );

            decisionLockRef.current = false;
            return;
          }

          /*
           * Candidate does NOT fit.
           *
           * If we already had accepted content,
           * finalize it and retry the same next item on a new page.
           */
          if (
            acceptedItems.length > 0
          ) {
            const basePage =
              makePhysicalPage(
                physicalPages.length + currentLogicalPhysicalPages.length,
                activeLogicalPage,
                acceptedItems.map(
                  (item) => item.block,
                ),
              );

            const finalized =
              addLogicalPageFixedBlocks(
                basePage,
                activeLogicalPage,
                currentLogicalPhysicalPages.length === 0,
              );

            setCurrentLogicalPhysicalPages((current) =>
              [...current, finalized],
            );

            setAcceptedItems([]);

            /*
             * Do NOT advance cursor.
             * Retry the overflowing block as the first block
             * of the next physical page.
             */
            setCandidateVersion(
              (current) =>
                current + 1,
            );

            decisionLockRef.current = false;
            return;
          }

          /*
           * A single block itself does not fit.
           *
           * We cannot safely split arbitrary blocks here.
           * Preserve it intact on its own physical page and let
           * Smart A4 minimum-safe handle it without data loss.
           */
          if (nextItem) {
            const splitBlocks =
              splitOversizedReportBlock(nextItem.block);

            if (splitBlocks.length > 1) {
              const splitItems = splitBlocks.map((block) => ({
                block,
                sourcePageId: nextItem.sourcePageId,
                sourcePageTitle: nextItem.sourcePageTitle,
              }));

              setEffectiveRegularItems((current) => [
                ...current.slice(0, cursor),
                ...splitItems,
                ...current.slice(cursor + 1),
              ]);

              setCandidateVersion((current) => current + 1);
              decisionLockRef.current = false;
              return;
            }

            const oversizedPage =
              makePhysicalPage(
                physicalPages.length + currentLogicalPhysicalPages.length,
                activeLogicalPage,
                [nextItem.block],
              );

            const withFixed =
              addLogicalPageFixedBlocks(
                oversizedPage,
                activeLogicalPage,
                currentLogicalPhysicalPages.length === 0,
              );

            const newPages = [
              ...currentLogicalPhysicalPages,
              withFixed,
            ];

            if (isLastItem) {
              completeCurrentLogicalPage(newPages);
            } else {
              setCurrentLogicalPhysicalPages(newPages);

              setCursor(
                (current) =>
                  current + 1,
              );

              setCandidateVersion(
                (current) =>
                  current + 1,
              );
            }

            decisionLockRef.current = false;
            return;
          }

          decisionLockRef.current = false;
        });
    };

    const observer =
      new MutationObserver(inspect);

    observer.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-smart-a4-phase",
      ],
    });

    inspect();

    return () => {
      observer.disconnect();

      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    activeLogicalPage,
    acceptedItems,
    candidateVersion,
    completeCurrentLogicalPage,
    currentLogicalPhysicalPages,
    cursor,
    done,
    effectiveRegularItems.length,
    hasRegularItems,
    nextItem,
    physicalPages,
  ]);

  /*
   * During calculation keep old/new physical pages hidden
   * until a stable plan exists.
   */
  const isPlanCurrent =
    plannedResetKey === semanticInputFingerprint;

  const handlePageCompositionReady = useCallback(
    (composition: ReportPhysicalPageComposition) => {
      setPageCompositions((current) => {
        const previous = current[composition.corePhysicalPageId];
        const previousFingerprint = previous
          ? createSemanticInputFingerprint(previous.pages)
          : "";
        const nextFingerprint = createSemanticInputFingerprint(
          composition.pages,
        );

        if (previousFingerprint === nextFingerprint) {
          return current;
        }

        return {
          ...current,
          [composition.corePhysicalPageId]: composition,
        };
      });
    },
    [],
  );

  const composedPhysicalPages = useMemo(
    () =>
      buildComposedPhysicalPages(
        physicalPages,
        pageCompositions,
        logicalPageModels,
      ),
    [logicalPageModels, pageCompositions, physicalPages],
  );

  const allCoreCompositionsReady =
    physicalPages.length > 0 &&
    physicalPages.every((page) => Boolean(pageCompositions[page.id]));

  const renderablePhysicalPages = useMemo(
    () =>
      finalPhysicalPages.length > 0
        ? finalPhysicalPages
        : composedPhysicalPages,
    [composedPhysicalPages, finalPhysicalPages],
  );

  const visiblePages =
    done && isPlanCurrent && renderablePhysicalPages.length
      ? renderablePhysicalPages
      : [];

  const selectedPhysicalPages =
    renderMode === "stack"
      ? visiblePages
      : (() => {
          if (!visiblePages.length) {
            return [];
          }

          if (activePhysicalPageId) {
            const matchingPhysicalPage = visiblePages.find(
              (page) => page.id === activePhysicalPageId,
            );

            if (matchingPhysicalPage) {
              return [matchingPhysicalPage];
            }
          }

          if (activePageId) {
            const matching =
              visiblePages.find(
                (page) =>
                  page.sourcePageIds.includes(
                    activePageId,
                  ),
              );

            if (matching) {
              return [matching];
            }
          }

          return [visiblePages[0]];
        })();

  useEffect(() => {
    if (!done) {
      return;
    }

    if (
      finalizedPlanRef.current?.semanticInputFingerprint ===
        semanticInputFingerprint &&
      (planningPhaseRef.current === "READY" ||
        planningPhaseRef.current === "FROZEN")
    ) {
      return;
    }

    const host = outputHostRef.current;

    if (!host) {
      return;
    }

    let frame: number | null = null;
    let disposed = false;
    let observer: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const setPhase = (next: PhysicalPlanningPhase) => {
      planningPhaseRef.current = next;
      setPlanningPhase((current) =>
        current === next ? current : next,
      );
    };

    const isTerminalPhase = () =>
      planningPhaseRef.current === "READY" ||
      planningPhaseRef.current === "FROZEN";

    const resetStability = () => {
      outputStabilityRef.current = {
        signature: "",
        count: 0,
        attempts: outputStabilityRef.current.attempts,
      };
    };

    const freezeFinalPlan = (
      layoutResultFingerprint: string,
    ) => {
      if (isTerminalPhase()) {
        return;
      }

      const frozenPages = composedPhysicalPages.map((page) => ({
        ...page,
        blocks: [...page.blocks],
        sourcePageIds: [...page.sourcePageIds],
      }));

      finalizedPlanRef.current = {
        semanticInputFingerprint,
        layoutResultFingerprint,
        pages: frozenPages,
      };

      setFinalPhysicalPages(frozenPages);

      if (process.env.NODE_ENV === "development") {
        host.dataset.reportPhysicalLayoutFingerprint =
          getFingerprintPrefix(layoutResultFingerprint);
        host.dataset.reportPhysicalStablePasses = String(
          outputStabilityRef.current.count,
        );
        host.dataset.reportPhysicalAttempts = String(
          outputStabilityRef.current.attempts,
        );
      }

      observer?.disconnect();
      resizeObserver?.disconnect();
      setPhase("READY");

      queueMicrotask(() => {
        if (
          !disposed &&
          planningPhaseRef.current === "READY" &&
          finalizedPlanRef.current?.semanticInputFingerprint ===
            semanticInputFingerprint
        ) {
          setPhase("FROZEN");
        }
      });
    };

    const inspect = () => {
      if (
        disposed ||
        isTerminalPhase() ||
        frame !== null
      ) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = null;

        if (
          disposed ||
          isTerminalPhase()
        ) {
          return;
        }

        outputStabilityRef.current.attempts += 1;

        const renderedPages = host.querySelectorAll(
          ".pdf-report-page",
        );

        if (!renderedPages.length) {
          resetStability();
          setPhase("MEASURING");
          if (
            outputStabilityRef.current.attempts <
            MAX_PHYSICAL_STABILIZATION_ATTEMPTS
          ) {
            inspect();
          } else {
            freezeFinalPlan(
              createSemanticInputFingerprint({
                fallback: "missing-rendered-page-dom",
                physicalPageCount: physicalPages.length,
                blocks: physicalPages.map((page) =>
                  page.blocks.map((block) => block?.id || block?.kind),
                ),
              }),
            );
          }
          return;
        }

        const smartViewports = Array.from(
          host.querySelectorAll<HTMLElement>(
            ".report-smart-a4-content",
          ),
        );

        const pageComposers = Array.from(
          host.querySelectorAll<HTMLElement>(
            "[data-report-smart-page-composer]",
          ),
        );

        const smartLayoutsFinal = smartViewports.every(
          (viewport) =>
            viewport.dataset.smartA4Phase === "FROZEN",
        );
        const smartLayoutsFit = smartViewports.every(
          (viewport) => viewport.dataset.reportOverflow === "fit",
        );

        const pageComposersReady = pageComposers.every(
          (composer) =>
            composer.dataset.reportSmartPagePhase === "FROZEN" ||
            composer.dataset.reportSmartPagePhase === "READY",
        );
        const hasExpectedComposerCount =
          pageComposers.length === physicalPages.length;
        const renderedPageCountMatchesComposition =
          renderedPages.length === composedPhysicalPages.length;

        const images = Array.from(
          host.querySelectorAll<HTMLImageElement>("img"),
        );
        const assetsSettled = images.every((image) => image.complete);
        const reachedAttemptLimit =
          outputStabilityRef.current.attempts >=
          MAX_PHYSICAL_STABILIZATION_ATTEMPTS;

        if (
          !smartLayoutsFinal ||
          !smartLayoutsFit ||
          !pageComposersReady ||
          !hasExpectedComposerCount ||
          !allCoreCompositionsReady ||
          !renderedPageCountMatchesComposition ||
          !assetsSettled ||
          !fontsSettledRef.current
        ) {
          resetStability();
          setPhase("MEASURING");

          if (reachedAttemptLimit) {
            freezeFinalPlan(
              createSemanticInputFingerprint({
                fallback: true,
                physicalPages: composedPhysicalPages.map((page) => ({
                  blocks: page.blocks.map((block) => block?.id || block?.kind),
                  sourcePageIds: page.sourcePageIds,
                })),
                renderedPageCount: renderedPages.length,
              }),
            );
          } else {
            inspect();
          }
          return;
        }

        const smartSignature = smartViewports.map((viewport) =>
          [
            viewport.dataset.smartA4Candidate || "legacy",
            viewport.dataset.reportDensity || "normal",
            viewport.dataset.reportFieldLayout || "comfortable",
            viewport.dataset.reportOverflow || "fit",
            roundLayoutMetric(
              Number(viewport.dataset.smartA4OverflowPx || "0"),
            ),
            roundLayoutMetric(
              Number(
                viewport.dataset.smartA4SignatureReservedPx || "0",
              ),
            ),
            viewport.dataset.smartA4FooterBoundaryUsed || "false",
            roundLayoutMetric(
              Number(viewport.dataset.smartA4BoundaryBottomPx || "0"),
            ),
          ].join(":"),
        );

        const composerSignature = pageComposers.map((composer) =>
          [
            composer.dataset.reportPrimaryEvidenceCount || "0",
            composer.dataset.reportTotalEvidenceCount || "0",
            composer.dataset.reportSignatureOnPrimary || "true",
            composer.dataset.reportSmartPagePhase || "",
          ].join(":"),
        );

        const signature = createSemanticInputFingerprint({
          physicalPages: composedPhysicalPages.map((page) => ({
            blocks: page.blocks.map((block) => block?.id || block?.kind),
            sourcePageIds: page.sourcePageIds,
          })),
          renderedPageCount: renderedPages.length,
          smartSignature,
          composerSignature,
        });

        const previous = outputStabilityRef.current;

        outputStabilityRef.current =
          previous.signature === signature
            ? {
              signature,
              count: previous.count + 1,
              attempts: previous.attempts,
            }
            : {
                signature,
                count: 1,
                attempts: previous.attempts,
              };

        if (process.env.NODE_ENV === "development") {
          host.dataset.reportPhysicalLayoutFingerprint =
            getFingerprintPrefix(signature);
          host.dataset.reportPhysicalStablePasses = String(
            outputStabilityRef.current.count,
          );
          host.dataset.reportPhysicalAttempts = String(
            outputStabilityRef.current.attempts,
          );
        }

        if (
          outputStabilityRef.current.count >= 2 ||
          reachedAttemptLimit
        ) {
          freezeFinalPlan(signature);
          return;
        }

        setPhase("STABILIZING");
        inspect();
      });
    };

    resetStability();
    setPhase("MEASURING");

    observer = new MutationObserver(inspect);

    observer.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-smart-a4-phase",
        "data-report-smart-page-phase",
      ],
    });

    resizeObserver = new ResizeObserver(() => {
      if (isTerminalPhase()) {
        return;
      }

      const rect = host.getBoundingClientRect();
      const nextResizeFingerprint = [
        roundLayoutMetric(rect.width),
        roundLayoutMetric(rect.height),
        roundLayoutMetric(host.scrollWidth),
        roundLayoutMetric(host.scrollHeight),
      ].join(":");

      if (
        outputResizeFingerprintRef.current === nextResizeFingerprint
      ) {
        return;
      }

      outputResizeFingerprintRef.current = nextResizeFingerprint;
      inspect();
    });
    resizeObserver.observe(host);

    const handleAssetLoad = (event: Event) => {
      if (isTerminalPhase()) {
        return;
      }

      const image =
        event.target instanceof HTMLImageElement
          ? event.target
          : null;
      const source = image?.currentSrc || image?.src || "";

      if (
        source &&
        settledAssetSourcesRef.current.has(source)
      ) {
        return;
      }

      if (source) {
        settledAssetSourcesRef.current.add(source);
      }

      resetStability();
      setPhase("MEASURING");
      inspect();
    };

    host.addEventListener("load", handleAssetLoad, true);
    host.addEventListener("error", handleAssetLoad, true);
    inspect();

    if (!document.fonts) {
      fontsSettledRef.current = true;
      inspect();
    } else if (fontsSettledRef.current) {
      inspect();
    } else {
      void document.fonts.ready
        .then(() => {
          if (!disposed && !fontsSettledRef.current) {
            fontsSettledRef.current = true;
            inspect();
          }
        })
        .catch(() => {
          if (!disposed) {
            fontsSettledRef.current = true;
            inspect();
          }
        });
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      resizeObserver?.disconnect();
      host.removeEventListener("load", handleAssetLoad, true);
      host.removeEventListener("error", handleAssetLoad, true);

      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    allCoreCompositionsReady,
    composedPhysicalPages,
    done,
    semanticInputFingerprint,
    physicalPages,
  ]);

  const isReady =
    done &&
    isPlanCurrent &&
    finalPhysicalPages.length > 0 &&
    (planningPhase === "READY" || planningPhase === "FROZEN");

  const corePhysicalPagesToRender =
    !isReady || renderMode === "stack"
      ? physicalPages
      : (() => {
          const selectedPage = selectedPhysicalPages[0];
          const selectedCorePage = selectedPage
            ? physicalPages.find(
                (page) => page.id === selectedPage.corePhysicalPageId,
              )
            : null;

          return selectedCorePage
            ? [selectedCorePage]
            : physicalPages.slice(0, 1);
        })();

  useEffect(() => {
    if (!isReady || !onPhysicalPagesChange) {
      return;
    }

    onPhysicalPagesChange(
      buildPhysicalNavigationItems(finalPhysicalPages),
    );
  }, [finalPhysicalPages, isReady, onPhysicalPagesChange]);

  const developmentDiagnostics =
    process.env.NODE_ENV === "development"
      ? {
          "data-report-physical-semantic-fingerprint":
            getFingerprintPrefix(semanticInputFingerprint),
          "data-report-physical-invalidation-reason":
            invalidationReason,
        }
      : {};

  return (
    <>
      <style>{`
        @media print {
          [data-report-physical-measurement-stage],
          [data-report-physical-output-planning="true"] {
            display: none !important;
          }
        }
      `}</style>
      {/*
       * ======================================================
       * OFFSCREEN MEASUREMENT STAGE
       * ======================================================
       *
       * This uses the REAL design and the REAL Smart A4 engine.
       * It is not an estimated character-count paginator.
       */}
      {!done ? (
        <div
          ref={measurementHostRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-[-100000px] top-0 -z-50 w-[210mm]"
          style={{
            visibility: "hidden",
            contain: "layout style paint",
          }}
          data-report-physical-measurement-stage
          data-report-measurement-only="true"
        >
          <ReportSmartSemanticFingerprintProvider
            fingerprint={createSemanticInputFingerprint({
              blocks: candidatePage.blocks,
              kind: candidatePage.kind,
              semanticInputFingerprint,
            })}
          >
            <A4DesignPage
              key={candidatePage.id}
              designId={designId}
              page={candidatePage}
              context={context}
              previewCase={previewCase}
              pageLabel={fallbackPageLabel}
            />
          </ReportSmartSemanticFingerprintProvider>
        </div>
      ) : null}

      {/*
       * ======================================================
       * PHYSICAL A4 OUTPUT
       * ======================================================
       */}
      {done ? (
        <div
          ref={outputHostRef}
          className={
            renderMode === "stack"
              ? "space-y-6 print:space-y-0"
              : ""
          }
          data-report-smart-physical-pages
          data-report-physical-planning-phase={planningPhase}
          data-report-physical-output-planning={String(!isReady)}
          data-report-physical-page-count={
            visiblePages.length
          }
          {...developmentDiagnostics}
          aria-hidden={!isReady ? "true" : undefined}
          style={
            !isReady
              ? {
                  position: "fixed",
                  left: "-100000px",
                  top: 0,
                  width: "210mm",
                  visibility: "hidden",
                  pointerEvents: "none",
                  contain: "layout style paint",
                  zIndex: -50,
                }
              : undefined
          }
        >
          {corePhysicalPagesToRender.map(
            (page, index) => (
              <div
                key={`${designId}:${getFingerprintPrefix(semanticInputFingerprint)}:${page.id}`}
                className={
                  renderMode === "stack" &&
                  index < corePhysicalPagesToRender.length - 1
                    ? "print:break-after-page"
                    : ""
                }
                data-report-physical-page-index={
                  index
                }
                data-report-source-pages={
                  page.sourcePageIds.join(",")
                }
              >
                <ReportSmartSemanticFingerprintProvider
                  fingerprint={createSemanticInputFingerprint({
                    page: {
                      blocks: page.blocks,
                      kind: page.kind,
                      title: page.title,
                    },
                    semanticInputFingerprint,
                  })}
                >
                  <SmartReportPageComposer
                    designId={designId}
                    page={page}
                    context={context}
                    previewCase={previewCase}
                    pageLabel={
                      page.title ||
                      fallbackPageLabel
                    }
                    suppressAutoEvidencePages={suppressAutoEvidencePages}
                    renderMode={isReady ? renderMode : "stack"}
                    activePhysicalPageId={
                      isReady ? selectedPhysicalPages[0]?.id : undefined
                    }
                    onCompositionReady={handlePageCompositionReady}
                  />
                </ReportSmartSemanticFingerprintProvider>
              </div>
            ),
          )}
        </div>
      ) : null}

      {!isReady ? (
        <div
          className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center font-bold text-slate-500 print:hidden"
          data-report-physical-planning
          data-report-physical-planning-phase={planningPhase}
          {...developmentDiagnostics}
        >
          <span
            className="h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"
            aria-hidden="true"
          />
          <span className="text-base sm:text-lg">
            جارٍ تنظيم صفحات التقرير...
          </span>
          <span className="text-sm font-medium text-slate-400">
            يتم ضبط توزيع المحتوى تلقائيًا
          </span>
        </div>
      ) : null}
    </>
  );
}
