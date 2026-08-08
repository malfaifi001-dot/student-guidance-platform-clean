"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReportDesignId } from "../report-design-types";
import { A4DesignPage } from "../shared/report-blocks";
import type { PreviewCaseData } from "../shared/report-types";
import { SmartReportPageComposer } from "./report-smart-page-composer";
import {
  createSemanticInputFingerprint,
  getFingerprintPrefix,
  ReportSmartSemanticFingerprintProvider,
  roundLayoutMetric,
} from "./report-smart-lifecycle";

type LogicalPage = {
  id?: string;
  title?: string;
  kind?: string;
  blocks?: any[];
  [key: string]: any;
};

type PhysicalPage = {
  id: string;
  title: string;
  kind: string;
  blocks: any[];
  sourcePageIds: string[];
};

type SmartPhysicalReportComposerProps = {
  designId: ReportDesignId;
  pages: LogicalPage[];
  activePageId?: string;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  fallbackPageLabel?: string;
  renderMode?: "single" | "stack";
  suppressAutoEvidencePages?: boolean;
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
  block: any;
  sourcePageId: string;
  sourcePageTitle: string;
};

function normalizePlacement(block: any) {
  return String(block?.placement || "flow").trim() || "flow";
}

function isVisibleBlock(block: any) {
  return Boolean(block) && block.visible !== false;
}

function isEvidenceBlock(block: any) {
  return String(block?.kind || "").trim() === "evidence-gallery";
}

function isSignatureBlock(block: any) {
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

function buildLogicalModel(pages: LogicalPage[]) {
  const regularItems: FlowItem[] = [];
  const signatureItems: FlowItem[] = [];
  const evidenceItems: FlowItem[] = [];

  const fixedBlocksBySourcePage = new Map<string, any[]>();

  pages.forEach((page, pageIndex) => {
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

    if (fixedBlocks.length) {
      fixedBlocksBySourcePage.set(
        sourcePageId,
        fixedBlocks,
      );
    }

    blocks
      .filter(
        (block) =>
          normalizePlacement(block) === "flow" ||
          isSignatureBlock(block),
      )
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
  });

  return {
    regularItems,
    signatureItems,
    evidenceItems,
    fixedBlocksBySourcePage,
  };
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
  items: FlowItem[],
  blocks: any[],
): PhysicalPage {
  const sourcePageIds = uniqueStrings(
    items.map((item) => item.sourcePageId),
  );

  const sourceTitles = uniqueStrings(
    items.map((item) => item.sourcePageTitle),
  );

  return {
    id: `smart-physical-${index + 1}`,
    title:
      sourceTitles.length === 1
        ? sourceTitles[0]
        : `التقرير - صفحة ${index + 1}`,
    kind: "content",
    blocks,
    sourcePageIds,
  };
}

function addFixedBlocks(
  physicalPage: PhysicalPage,
  fixedBlocksBySourcePage: Map<string, any[]>,
  alreadyConsumedSources: Set<string>,
) {
  const fixedBlocks: any[] = [];

  for (const sourcePageId of physicalPage.sourcePageIds) {
    if (alreadyConsumedSources.has(sourcePageId)) {
      continue;
    }

    const sourceFixed =
      fixedBlocksBySourcePage.get(sourcePageId) || [];

    if (sourceFixed.length) {
      fixedBlocks.push(...sourceFixed);
    }

    alreadyConsumedSources.add(sourcePageId);
  }

  if (!fixedBlocks.length) {
    return physicalPage;
  }

  return {
    ...physicalPage,
    blocks: [
      ...physicalPage.blocks,
      ...fixedBlocks,
    ],
  };
}

function appendSpecialBlocks(
  pages: PhysicalPage[],
  evidenceItems: FlowItem[],
  signatureItems: FlowItem[],
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
            title: "التقرير",
            kind: "content",
            blocks: [],
            sourcePageIds: [],
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
  const evidenceBlocks =
    evidenceItems.length > 0
      ? [evidenceItems[0].block]
      : [];

  /*
   * If multiple evidence-gallery blocks exist,
   * only the first one receives automatic evidence pagination.
   * Additional evidence blocks stay explicit rather than being
   * silently discarded.
   */
  const additionalEvidenceBlocks =
    evidenceItems.slice(1).map((item) => item.block);

  const signatureBlocks =
    signatureItems.map((item) => item.block);

  result[lastIndex] = {
    ...last,
    sourcePageIds: uniqueStrings([
      ...last.sourcePageIds,
      ...evidenceItems.map((item) => item.sourcePageId),
      ...signatureItems.map((item) => item.sourcePageId),
    ]),
    blocks: [
      ...last.blocks,
      ...evidenceBlocks,
      ...additionalEvidenceBlocks,
      ...signatureBlocks,
    ],
  };

  return result;
}

export function SmartPhysicalReportComposer({
  designId,
  pages,
  activePageId,
  context,
  previewCase,
  fallbackPageLabel = "التقرير",
  renderMode = "stack",
  suppressAutoEvidencePages = false,
}: SmartPhysicalReportComposerProps) {
  const model = useMemo(
    () => buildLogicalModel(pages || []),
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

  const [acceptedItems, setAcceptedItems] =
    useState<FlowItem[]>([]);

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
    setAcceptedItems([]);
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

  const hasRegularItems =
    model.regularItems.length > 0;

  const nextItem =
    model.regularItems[cursor];

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
      return model.signatureItems.map(
        (item) => item.block,
      );
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
    return candidateItems.map(
      (item) => item.block,
    );
  }, [
    candidateItems,
    hasRegularItems,
    model.signatureItems,
  ]);

  const candidatePage = useMemo(
    () => ({
      id:
        `smart-measure-${candidateVersion}-${cursor}-${acceptedItems.length}`,

      title: fallbackPageLabel,

      kind: "content",

      blocks: candidateBlocks,
    }),
    [
      candidateVersion,
      cursor,
      acceptedItems.length,
      fallbackPageLabel,
      candidateBlocks,
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
    if (
      model.signatureItems.length > 0
    ) {
      return;
    }

    const emptyBase =
      makePhysicalPage(
        0,
        [],
        [],
      );

    const completed =
      appendSpecialBlocks(
        [emptyBase],
        model.evidenceItems,
        model.signatureItems,
      );

    setPhysicalPages(completed);
    setDone(true);
  }, [
    done,
    hasRegularItems,
    model.evidenceItems,
    model.signatureItems,
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

          const fits =
            viewport.dataset.reportOverflow ===
            "fit";

          decisionLockRef.current = true;

          /*
           * ---------------------------------------------------
           * NO REGULAR CONTENT, SIGNATURE-ONLY CORE PAGE
           * ---------------------------------------------------
           */
          if (!hasRegularItems) {
            const signatureItems =
              model.signatureItems;

            const base =
              makePhysicalPage(
                0,
                signatureItems,
                signatureItems.map(
                  (item) => item.block,
                ),
              );

            const completed =
              appendSpecialBlocks(
                [
                  {
                    ...base,
                    /*
                     * Signature already exists in this measured
                     * base, so prevent duplicate append below.
                     */
                    blocks: [],
                  },
                ],
                model.evidenceItems,
                model.signatureItems,
              );

            setPhysicalPages(completed);
            setDone(true);

            decisionLockRef.current = false;
            return;
          }

          const isLastItem =
            cursor >=
            model.regularItems.length - 1;

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
                  physicalPages.length,
                  nextAccepted,
                  nextAccepted.map(
                    (item) => item.block,
                  ),
                );

              const consumedFixedSources =
                new Set<string>();

              physicalPages.forEach(
                (page) =>
                  page.sourcePageIds.forEach(
                    (sourceId) =>
                      consumedFixedSources.add(
                        sourceId,
                      ),
                  ),
              );

              const withFixed =
                addFixedBlocks(
                  basePage,
                  model.fixedBlocksBySourcePage,
                  consumedFixedSources,
                );

              const completedBase = [
                ...physicalPages,
                withFixed,
              ];

              const completed =
                appendSpecialBlocks(
                  completedBase,
                  model.evidenceItems,
                  model.signatureItems,
                );

              setPhysicalPages(
                completed,
              );

              setAcceptedItems([]);
              setDone(true);

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
                physicalPages.length,
                acceptedItems,
                acceptedItems.map(
                  (item) => item.block,
                ),
              );

            const consumedFixedSources =
              new Set<string>();

            physicalPages.forEach(
              (page) =>
                page.sourcePageIds.forEach(
                  (sourceId) =>
                    consumedFixedSources.add(
                      sourceId,
                    ),
                ),
            );

            const finalized =
              addFixedBlocks(
                basePage,
                model.fixedBlocksBySourcePage,
                consumedFixedSources,
              );

            setPhysicalPages(
              (current) => [
                ...current,
                finalized,
              ],
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
            const oversizedPage =
              makePhysicalPage(
                physicalPages.length,
                [nextItem],
                [nextItem.block],
              );

            const consumedFixedSources =
              new Set<string>();

            physicalPages.forEach(
              (page) =>
                page.sourcePageIds.forEach(
                  (sourceId) =>
                    consumedFixedSources.add(
                      sourceId,
                    ),
                ),
            );

            const withFixed =
              addFixedBlocks(
                oversizedPage,
                model.fixedBlocksBySourcePage,
                consumedFixedSources,
              );

            const newPages = [
              ...physicalPages,
              withFixed,
            ];

            if (isLastItem) {
              const completed =
                appendSpecialBlocks(
                  newPages,
                  model.evidenceItems,
                  model.signatureItems,
                );

              setPhysicalPages(
                completed,
              );

              setDone(true);
            } else {
              setPhysicalPages(
                newPages,
              );

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
    acceptedItems,
    candidateVersion,
    cursor,
    done,
    hasRegularItems,
    model.evidenceItems,
    model.fixedBlocksBySourcePage,
    model.regularItems,
    model.signatureItems,
    nextItem,
    physicalPages,
  ]);

  /*
   * During calculation keep old/new physical pages hidden
   * until a stable plan exists.
   */
  const isPlanCurrent =
    plannedResetKey === semanticInputFingerprint;

  const renderablePhysicalPages =
    finalPhysicalPages.length > 0
      ? finalPhysicalPages
      : physicalPages;

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

      const frozenPages = physicalPages.map((page) => ({
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

        const pageComposersReady = pageComposers.every(
          (composer) =>
            composer.dataset.reportSmartPagePhase === "FROZEN" ||
            composer.dataset.reportSmartPagePhase === "READY",
        );

        const images = Array.from(
          host.querySelectorAll<HTMLImageElement>("img"),
        );
        const assetsSettled = images.every((image) => image.complete);
        const reachedAttemptLimit =
          outputStabilityRef.current.attempts >=
          MAX_PHYSICAL_STABILIZATION_ATTEMPTS;

        if (
          !smartLayoutsFinal ||
          !pageComposersReady ||
          !assetsSettled ||
          !fontsSettledRef.current
        ) {
          resetStability();
          setPhase("MEASURING");

          if (reachedAttemptLimit) {
            freezeFinalPlan(
              createSemanticInputFingerprint({
                fallback: true,
                physicalPages: physicalPages.map((page) => ({
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
          physicalPages: physicalPages.map((page) => ({
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
    done,
    semanticInputFingerprint,
    physicalPages,
  ]);

  const isReady =
    done &&
    isPlanCurrent &&
    finalPhysicalPages.length > 0 &&
    (planningPhase === "READY" || planningPhase === "FROZEN");

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
          {selectedPhysicalPages.map(
            (page, index) => (
              <div
                key={`${designId}:${candidateVersion}:${page.id}`}
                className={
                  renderMode === "stack" &&
                  index < selectedPhysicalPages.length - 1
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
                  {suppressAutoEvidencePages ? (
                    <A4DesignPage
                      designId={designId}
                      page={page}
                      context={context}
                      previewCase={previewCase}
                      pageLabel={
                        page.title ||
                        fallbackPageLabel
                      }
                    />
                  ) : (
                    <SmartReportPageComposer
                      designId={designId}
                      page={page}
                      context={context}
                      previewCase={previewCase}
                      pageLabel={
                        page.title ||
                        fallbackPageLabel
                      }
                    />
                  )}
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
