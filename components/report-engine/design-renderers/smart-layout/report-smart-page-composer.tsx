"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReportDesignId } from "../report-design-types";
import { A4DesignPage } from "../shared/report-blocks";
import {
  getEvidencePerPage,
  getValidPreviewEvidences,
} from "../shared/report-evidence-data";
import { AutoEvidencePages } from "../shared/report-auto-evidence";
import type { PreviewCaseData } from "../shared/report-types";

type SmartReportPageComposerProps = {
  designId: ReportDesignId;
  page?: any;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  pageLabel: string;
};

function getEvidenceBlock(page: any) {
  const blocks = Array.isArray(page?.blocks)
    ? page.blocks
    : [];

  return (
    blocks.find(
      (block: any) =>
        block?.kind === "evidence-gallery",
    ) || null
  );
}

function getCompositionResetKey(
  page: any,
  previewCase: PreviewCaseData | null,
) {
  const blocks = Array.isArray(page?.blocks)
    ? page.blocks.map((block: any) => ({
        id: block?.id,
        kind: block?.kind,
        title: block?.title,
        content: block?.content,
        visible: block?.visible,
        evidenceLimit: block?.evidenceLimit,
        evidenceStartIndex:
          block?.evidenceStartIndex,
        dynamicFields:
          block?.dynamicFields,
        signatures:
          block?.signatures,
        rows:
          block?.rows,
        columns:
          block?.columns,
      }))
    : [];

  const values = Array.isArray(
    previewCase?.values,
  )
    ? previewCase.values.map((item) => ({
        fieldKey: item?.fieldKey,
        fieldLabel: item?.fieldLabel,
        value: item?.value,
        valueItems: item?.valueItems,
      }))
    : [];

  const evidences = Array.isArray(
    previewCase?.evidences,
  )
    ? previewCase.evidences.map(
        (evidence) => ({
          id: evidence?.id,
          title: evidence?.title,
          caption: evidence?.caption,
          url:
            evidence?.imageUrl ||
            evidence?.url ||
            evidence?.fileUrl ||
            evidence?.publicUrl ||
            evidence?.storagePath ||
            "",
        }),
      )
    : [];

  return JSON.stringify({
    pageId: page?.id || "",
    blocks,
    values,
    evidences,
  });
}

function makePrimaryPage(
  page: any,
  evidenceBlock: any,
  primaryEvidenceCount: number,
) {
  if (!page || !evidenceBlock) {
    return page;
  }

  const blocks = Array.isArray(page.blocks)
    ? page.blocks
    : [];

  /*
   * Zero means:
   * do not render the evidence block on the primary page.
   *
   * The original evidence block is NOT lost.
   * AutoEvidencePages receives the original page and starts
   * from primaryEvidenceCount.
   */
  if (primaryEvidenceCount <= 0) {
    return {
      ...page,
      blocks: blocks.filter(
        (block: any) =>
          block?.id !== evidenceBlock.id,
      ),
    };
  }

  return {
    ...page,
    blocks: blocks.map((block: any) =>
      block?.id === evidenceBlock.id
        ? {
            ...block,
            evidenceStartIndex: 0,
            evidenceLimit:
              primaryEvidenceCount,
          }
        : block,
    ),
  };
}

export function SmartReportPageComposer({
  designId,
  page,
  context,
  previewCase,
  pageLabel,
}: SmartReportPageComposerProps) {
  const hostRef =
    useRef<HTMLDivElement | null>(null);

  const evidenceBlock = useMemo(
    () => getEvidenceBlock(page),
    [page],
  );

  const validEvidences = useMemo(
    () =>
      getValidPreviewEvidences(
        previewCase,
      ),
    [previewCase],
  );

  const evidenceAutoEnabled =
    Boolean(evidenceBlock) &&
    evidenceBlock?.evidenceAutoCreatePages !==
      false;

  const maxPrimaryEvidenceCount =
    evidenceBlock
      ? Math.min(
          validEvidences.length,
          getEvidencePerPage(
            evidenceBlock,
          ),
        )
      : 0;

  const resetKey = useMemo(
    () =>
      getCompositionResetKey(
        page,
        previewCase,
      ),
    [page, previewCase],
  );

  const [
    primaryEvidenceCount,
    setPrimaryEvidenceCount,
  ] = useState(
    maxPrimaryEvidenceCount,
  );

  const lastDecisionRef =
    useRef("");

  /*
   * Whenever the actual report data/template changes,
   * restart optimistically with the maximum evidence count.
   *
   * Then real DOM measurement decides whether it must reduce.
   */
  useEffect(() => {
    lastDecisionRef.current = "";

    setPrimaryEvidenceCount(
      maxPrimaryEvidenceCount,
    );
  }, [
    resetKey,
    maxPrimaryEvidenceCount,
  ]);

  const primaryPage = useMemo(
    () =>
      makePrimaryPage(
        page,
        evidenceBlock,
        primaryEvidenceCount,
      ),
    [
      page,
      evidenceBlock,
      primaryEvidenceCount,
    ],
  );

  useEffect(() => {
    const host = hostRef.current;

    if (!host) return;

    let frame: number | null = null;

    const inspect = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(
          frame,
        );
      }

      frame =
        window.requestAnimationFrame(
          () => {
            frame = null;

            const smartViewport =
              host.querySelector<HTMLElement>(
                ".report-smart-a4-content",
              );

            if (!smartViewport) {
              return;
            }

            /*
             * Smart A4 sets this only after a real measurement pass.
             * This prevents acting on the optimistic initial React state.
             */
            const severity =
              smartViewport.dataset
                .smartA4Severity;

            if (!severity) {
              return;
            }

            const overflowState =
              smartViewport.dataset
                .reportOverflow;

            const dominantRole =
              smartViewport.dataset
                .smartA4DominantRole ||
              "general";

            const density =
              smartViewport.dataset
                .reportDensity ||
              "normal";

            const overflowPx = Number(
              smartViewport.getAttribute(
                "data-smart-a4-overflow-px",
              ) || "0",
            );

            const doesNotFit =
              overflowState !== "fit";

            const decisionSignature = [
              page?.id || "",
              primaryEvidenceCount,
              doesNotFit,
              severity,
              dominantRole,
              density,
              Number.isFinite(overflowPx)
                ? overflowPx
                : 0,
            ].join("::");

            if (
              lastDecisionRef.current ===
              decisionSignature
            ) {
              return;
            }

            lastDecisionRef.current =
              decisionSignature;

            /*
             * Core composer rule:
             *
             * Preserve fields + narrative + signature first.
             *
             * Evidence is movable content, so if the complete
             * page cannot fit even after Smart A4 has selected
             * its best safe density, reduce evidence one item
             * at a time.
             *
             * Each reduction causes a fresh real DOM measurement.
             */
            const preferEvidenceMove =
              smartViewport.dataset
                .smartA4PreferEvidenceMove ===
              "true";

            /*
             * Evidence is movable.
             *
             * We reduce one evidence at a time when:
             *
             * 1) the selected plan still does not fit, OR
             * 2) it fits only by accepting aggressive density.
             *
             * After every reduction the Smart A4 engine gets
             * a fresh DOM and re-evaluates all candidate plans.
             *
             * This lets a report prefer:
             * normal/packed + 1 evidence
             * over
             * minimum-safe + 2 evidences.
             */
            if (
              evidenceAutoEnabled &&
              primaryEvidenceCount > 0 &&
              (
                doesNotFit ||
                preferEvidenceMove
              )
            ) {
              setPrimaryEvidenceCount(
                (current) =>
                  Math.max(
                    0,
                    current - 1,
                  ),
              );
            }
          },
        );
    };

    const observer =
      new MutationObserver(inspect);

    observer.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-report-overflow",
        "data-report-density",
        "data-smart-a4-mode",
        "data-smart-a4-fits",
        "data-smart-a4-overflow-px",
        "data-smart-a4-dominant-role",
        "data-smart-a4-severity",
        "data-smart-a4-signature-reserved-px",
        "data-smart-a4-prefer-evidence-move",
        "data-smart-a4-candidate",
        "data-smart-a4-score",
        "data-report-field-layout",
      ],
    });

    inspect();

    return () => {
      observer.disconnect();

      if (frame !== null) {
        window.cancelAnimationFrame(
          frame,
        );
      }
    };
  }, [
    page?.id,
    primaryEvidenceCount,
    evidenceAutoEnabled,
  ]);

  return (
    <div
      ref={hostRef}
      data-report-smart-page-composer
      data-report-primary-evidence-count={
        primaryEvidenceCount
      }
      data-report-total-evidence-count={
        validEvidences.length
      }
    >
      <A4DesignPage
        designId={designId}
        page={primaryPage}
        context={context}
        previewCase={previewCase}
        pageLabel={pageLabel}
      />

      {evidenceAutoEnabled ? (
        <AutoEvidencePages
          designId={designId}
          activePage={page}
          context={context}
          previewCase={previewCase}
          primaryEvidenceCount={
            primaryEvidenceCount
          }
        />
      ) : null}
    </div>
  );
}