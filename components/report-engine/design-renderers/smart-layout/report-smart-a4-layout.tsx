"use client";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  getReportSmartA4Profile,
  getReportSmartA4StyleVariables,
  type ReportSmartA4Mode,
  type ReportSmartA4PriorityMode,
  type ReportSmartA4Profile,
} from "./report-smart-a4-config";

import {
  measureReportSmartA4Layout,
  type ReportSmartA4BlockRole,
} from "./report-smart-a4-measure";

import {
  REPORT_SMART_A4_CANDIDATES,
  chooseReportSmartA4Plan,
  scoreReportSmartA4Candidate,
  type ReportSmartA4FieldLayout,
  type ReportSmartA4OverflowSeverity,
  type ReportSmartA4EvaluatedCandidate,
} from "./report-smart-a4-planner";

export type ReportSmartA4LayoutResult = {
  mode: ReportSmartA4Mode;
  fieldLayout: ReportSmartA4FieldLayout;

  fits: boolean;
  needsOverflowPage: boolean;

  overflowPx: number;

  signatureHeightPx: number;
  signatureReservedPx: number;

  dominantRole: ReportSmartA4BlockRole;
  severity: ReportSmartA4OverflowSeverity;

  candidateId: string;
  score: number;

  preferEvidenceMove: boolean;
};

type ReportSmartA4ContentRegionProps = {
  children: ReactNode;

  heightMm: number;

  className?: string;
  contentClassName?: string;

  layoutKey?: string | number;

  priorityMode?: ReportSmartA4PriorityMode;

  onLayoutResult?: (
    result: ReportSmartA4LayoutResult,
  ) => void;
};

const INITIAL_RESULT: ReportSmartA4LayoutResult = {
  mode: "normal",
  fieldLayout: "comfortable",

  fits: true,
  needsOverflowPage: false,

  overflowPx: 0,

  signatureHeightPx: 0,
  signatureReservedPx: 0,

  dominantRole: "general",
  severity: "none",

  candidateId:
    "normal-comfortable",

  score: 0,

  preferEvidenceMove: false,
};

const SMART_A4_ENGINE_CSS = `
  /*
   * =========================================================
   * GENERIC SMART FIELD GRID
   * =========================================================
   */

  .report-smart-a4-content
  .report-smart-field-grid {
    display: grid !important;
    grid-template-columns:
      repeat(4, minmax(0, 1fr)) !important;
    align-items: stretch;
  }

  /*
   * Comfortable:
   * نحافظ على شكل البطاقات الواسع.
   */

  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-smart-field-item[data-smart-field-kind="short"] {
    grid-column: span 1;
  }

  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-smart-field-item[data-smart-field-kind="medium"] {
    grid-column: span 2;
  }

  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-smart-field-item[data-smart-field-kind="long"],
  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-smart-field-item[data-smart-field-kind="list"] {
    grid-column: span 4;
  }

  /*
   * Packed:
   * القيم القصيرة تصبح ربع صف.
   * المتوسط نصف صف.
   */

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-smart-field-item[data-smart-field-kind="short"],
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="short"] {
    grid-column: span 1;
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-smart-field-item[data-smart-field-kind="medium"],
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="medium"] {
    grid-column: span 2;
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-smart-field-item[data-smart-field-kind="long"],
  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-smart-field-item[data-smart-field-kind="list"],
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="long"],
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="list"] {
    grid-column: span 4;
  }

  /*
   * Inline:
   * للحقول القصيرة والمتوسطة فقط.
   *
   * MetaCard الحالي يحتوي label/value كأبناء مباشرين،
   * فنستفيد من نفس التصميم بدون بناء renderer خاص.
   */

  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="short"] > div,
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="medium"] > div {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr);
    align-items: center;
    column-gap: 0.35rem;
  }

  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="short"] > div > p,
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="medium"] > div > p {
    margin-top: 0 !important;
    min-width: 0;
  }

  /*
   * =========================================================
   * CLASSIC FORMAL TABLE GRID
   * =========================================================
   */

  .report-smart-a4-content
  .report-classic-smart-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap:
      calc(
        2.6mm *
        var(--report-field-spacing-scale, 1)
      );
    align-items: stretch;
  }

  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-classic-smart-field-item[data-smart-field-kind="short"] {
    grid-column: span 1;
  }

  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-classic-smart-field-item[data-smart-field-kind="medium"] {
    grid-column: span 2;
  }

  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-classic-smart-field-item[data-smart-field-kind="long"],
  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-classic-smart-field-item[data-smart-field-kind="list"] {
    grid-column: span 4;
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-classic-smart-field-item[data-smart-field-kind="short"],
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-classic-smart-field-item[data-smart-field-kind="short"] {
    grid-column: span 1;
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-classic-smart-field-item[data-smart-field-kind="medium"],
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-classic-smart-field-item[data-smart-field-kind="medium"] {
    grid-column: span 2;
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-classic-smart-field-item[data-smart-field-kind="long"],
  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-classic-smart-field-item[data-smart-field-kind="list"],
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-classic-smart-field-item[data-smart-field-kind="long"],
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-classic-smart-field-item[data-smart-field-kind="list"] {
    grid-column: span 4;
  }

  /*
   * =========================================================
   * CUSTOM VALUE GRIDS - GENERIC DENSITY HOOKS
   * =========================================================
   *
   * MOE 2024 keeps its original visual identity.
   * We only reduce wasted vertical height and allow two-column
   * packing for non-wide values.
   */

  .report-smart-a4-content
  .moe24-report-detail-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr)) !important;
  }

  .report-smart-a4-content
  .moe24-report-field:not(.moe24-report-field-wide) {
    grid-column: span 1 !important;
  }

  .report-smart-a4-content
  .moe24-report-field-wide {
    grid-column: 1 / -1 !important;
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .moe24-report-details-panel,
  .report-smart-a4-content[data-report-field-layout="inline"]
  .moe24-report-details-panel {
    padding:
      calc(
        2.8mm *
        var(--report-field-spacing-scale, 1)
      ) !important;
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .moe24-report-detail-grid,
  .report-smart-a4-content[data-report-field-layout="inline"]
  .moe24-report-detail-grid {
    row-gap:
      calc(
        1.2mm *
        var(--report-field-spacing-scale, 1)
      ) !important;

    column-gap:
      calc(
        2.2mm *
        var(--report-field-spacing-scale, 1)
      ) !important;
  }
  /*
   * =========================================================
   * EVIDENCE
   * =========================================================
   */

  .report-smart-a4-content
  [data-report-smart-block="evidence-gallery"] img {
    max-height:
      var(
        --report-evidence-max-height,
        78mm
      ) !important;
  }

  .report-smart-a4-content
  [data-report-smart-block="evidence-gallery"]
  .report-design-evidence-fallback {
    max-height:
      var(
        --report-evidence-max-height,
        78mm
      ) !important;
  }

  /*
   * =========================================================
   * SIGNATURE
   * =========================================================
   */

  .report-smart-a4-content
  [data-report-priority-block="signature"] {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
`;

function applyProfile(
  element: HTMLElement,
  profile: ReportSmartA4Profile,
) {
  const variables =
    getReportSmartA4StyleVariables(
      profile,
    );

  Object.entries(
    variables,
  ).forEach(
    ([property, value]) => {
      element.style.setProperty(
        property,
        String(value),
      );
    },
  );
}

function applyCandidate(
  viewport: HTMLElement,
  profile: ReportSmartA4Profile,
  fieldLayout:
    ReportSmartA4FieldLayout,
) {
  applyProfile(
    viewport,
    profile,
  );

  viewport.dataset.reportDensity =
    profile.mode;

  viewport.dataset.reportFieldLayout =
    fieldLayout;
}

function nextAnimationFrame() {
  return new Promise<void>(
    (resolve) => {
      window.requestAnimationFrame(
        () => resolve(),
      );
    },
  );
}

function sameResult(
  current: ReportSmartA4LayoutResult,
  next: ReportSmartA4LayoutResult,
) {
  return (
    current.mode === next.mode &&
    current.fieldLayout ===
      next.fieldLayout &&
    current.fits === next.fits &&
    current.needsOverflowPage ===
      next.needsOverflowPage &&
    current.overflowPx ===
      next.overflowPx &&
    current.signatureHeightPx ===
      next.signatureHeightPx &&
    current.signatureReservedPx ===
      next.signatureReservedPx &&
    current.dominantRole ===
      next.dominantRole &&
    current.severity ===
      next.severity &&
    current.candidateId ===
      next.candidateId &&
    current.score === next.score &&
    current.preferEvidenceMove ===
      next.preferEvidenceMove
  );
}

export function ReportSmartA4ContentRegion({
  children,
  heightMm,
  className = "",
  contentClassName = "",
  layoutKey,
  priorityMode = "signature",
  onLayoutResult,
}: ReportSmartA4ContentRegionProps) {
  const viewportRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const contentRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const scheduledFrameRef =
    useRef<number | null>(null);

  const runIdRef =
    useRef(0);

  const measuringRef =
    useRef(false);

  const resultRef =
    useRef(INITIAL_RESULT);

  const onLayoutResultRef =
    useRef(onLayoutResult);

  const [result, setResult] =
    useState(INITIAL_RESULT);

  useEffect(() => {
    onLayoutResultRef.current =
      onLayoutResult;
  }, [onLayoutResult]);

  const runMeasurement =
    useCallback(async () => {
      const viewport =
        viewportRef.current;

      const content =
        contentRef.current;

      if (
        !viewport ||
        !content ||
        measuringRef.current
      ) {
        return;
      }

      measuringRef.current = true;

      const runId =
        ++runIdRef.current;

      try {
        const evaluated:
          ReportSmartA4EvaluatedCandidate[] =
          [];

        /*
         * -----------------------------------------------------
         * PLAN EXPLORATION
         * -----------------------------------------------------
         *
         * كل Candidate يطبق فعلًا على DOM ثم يقاس.
         * لا نعتمد على تقدير عدد الأحرف فقط.
         */
        for (
          const candidate of
          REPORT_SMART_A4_CANDIDATES
        ) {
          const profile =
            getReportSmartA4Profile(
              candidate.mode,
            );

          applyCandidate(
            viewport,
            profile,
            candidate.fieldLayout,
          );

          await nextAnimationFrame();
          await nextAnimationFrame();

          if (
            runId !== runIdRef.current
          ) {
            return;
          }

          const measurement =
            measureReportSmartA4Layout(
              viewport,
              content,
              priorityMode,
              profile,
            );

          const score =
            scoreReportSmartA4Candidate(
              candidate,
              measurement,
            );

          evaluated.push({
            candidate,
            profile,
            measurement,
            score,
          });
        }

        if (
          runId !== runIdRef.current ||
          !evaluated.length
        ) {
          return;
        }

        const plan =
          chooseReportSmartA4Plan(
            evaluated,
          );

        const selected =
          evaluated.find(
            (item) =>
              item.candidate.id ===
              plan.candidateId,
          ) || evaluated[
            evaluated.length - 1
          ];

        /*
         * تثبيت الخطة الفائزة فقط بعد انتهاء جميع القياسات.
         */
        applyCandidate(
          viewport,
          selected.profile,
          selected.candidate
            .fieldLayout,
        );

        await nextAnimationFrame();

        if (
          runId !== runIdRef.current
        ) {
          return;
        }

        /*
         * قياس نهائي بعد تثبيت الخطة الفائزة.
         * هذا يمنع اختلاف القياس بسبب frame وسيط.
         */
        const finalMeasurement =
          measureReportSmartA4Layout(
            viewport,
            content,
            priorityMode,
            selected.profile,
          );

        const finalScore =
          scoreReportSmartA4Candidate(
            selected.candidate,
            finalMeasurement,
          );

        const finalPlan =
          chooseReportSmartA4Plan([
            {
              candidate:
                selected.candidate,
              profile:
                selected.profile,
              measurement:
                finalMeasurement,
              score:
                finalScore,
            },
          ]);

        const nextResult:
          ReportSmartA4LayoutResult = {
          mode:
            selected.candidate.mode,

          fieldLayout:
            selected.candidate
              .fieldLayout,

          fits:
            finalMeasurement.fits,

          needsOverflowPage:
            !finalMeasurement.fits,

          overflowPx:
            finalMeasurement
              .overflowPx,

          signatureHeightPx:
            finalMeasurement
              .signatureHeightPx,

          signatureReservedPx:
            finalMeasurement
              .signatureReservedPx,

          dominantRole:
            finalMeasurement
              .dominantRole,

          severity:
            finalPlan.severity,

          candidateId:
            selected.candidate.id,

          score:
            Math.round(
              finalScore * 10,
            ) / 10,

          /*
           * Important:
           * preserve decision from ALL candidate evaluation.
           * If the best overall fit required aggressive density,
           * Composer may move evidence and let us re-plan.
           */
          preferEvidenceMove:
            plan.preferEvidenceMove,
        };

        viewport.dataset
          .smartA4DominantRole =
          nextResult.dominantRole;

        viewport.dataset
          .smartA4Severity =
          nextResult.severity;

        viewport.dataset
          .smartA4Candidate =
          nextResult.candidateId;

        viewport.dataset
          .smartA4Score =
          String(nextResult.score);

        viewport.dataset
          .smartA4PreferEvidenceMove =
          String(
            nextResult
              .preferEvidenceMove,
          );

        viewport.dataset
          .smartA4SignatureProtected =
          String(
            nextResult
              .signatureHeightPx > 0,
          );

        if (
          !sameResult(
            resultRef.current,
            nextResult,
          )
        ) {
          resultRef.current =
            nextResult;

          setResult(nextResult);

          onLayoutResultRef.current?.(
            nextResult,
          );
        }
      } finally {
        measuringRef.current =
          false;
      }
    }, [priorityMode]);

  const scheduleMeasurement =
    useCallback(() => {
      if (
        measuringRef.current ||
        scheduledFrameRef.current !==
          null
      ) {
        return;
      }

      scheduledFrameRef.current =
        window.requestAnimationFrame(
          () => {
            scheduledFrameRef.current =
              null;

            void runMeasurement();
          },
        );
    }, [runMeasurement]);

  useLayoutEffect(() => {
    scheduleMeasurement();
  }, [
    children,
    heightMm,
    layoutKey,
    scheduleMeasurement,
  ]);

  useEffect(() => {
    const viewport =
      viewportRef.current;

    const content =
      contentRef.current;

    if (
      !viewport ||
      !content
    ) {
      return;
    }

    const resizeObserver =
      new ResizeObserver(() => {
        scheduleMeasurement();
      });

    const mutationObserver =
      new MutationObserver(() => {
        scheduleMeasurement();
      });

    const handleLoadedAsset =
      () => {
        scheduleMeasurement();
      };

    resizeObserver.observe(
      viewport,
    );

    resizeObserver.observe(
      content,
    );

    mutationObserver.observe(
      content,
      {
        childList: true,
        characterData: true,
        subtree: true,
      },
    );

    content.addEventListener(
      "load",
      handleLoadedAsset,
      true,
    );

    window.addEventListener(
      "resize",
      scheduleMeasurement,
    );

    void document.fonts?.ready
      .then(
        scheduleMeasurement,
      )
      .catch(
        () => undefined,
      );

    return () => {
      runIdRef.current += 1;

      resizeObserver.disconnect();
      mutationObserver.disconnect();

      content.removeEventListener(
        "load",
        handleLoadedAsset,
        true,
      );

      window.removeEventListener(
        "resize",
        scheduleMeasurement,
      );

      if (
        scheduledFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          scheduledFrameRef.current,
        );

        scheduledFrameRef.current =
          null;
      }
    };
  }, [scheduleMeasurement]);

  const selectedProfile =
    getReportSmartA4Profile(
      result.mode,
    );

  const selectedVariables =
    getReportSmartA4StyleVariables(
      selectedProfile,
    );

  const viewportStyle = {
    ...selectedVariables,

    height: `${heightMm}mm`,
    minHeight: `${heightMm}mm`,
    maxHeight: `${heightMm}mm`,

    overflow:
      result.needsOverflowPage
        ? "visible"
        : "hidden",
  } as CSSProperties;

  const developmentDiagnostics =
    process.env.NODE_ENV ===
    "development"
      ? {
          "data-smart-a4-mode":
            result.mode,

          "data-smart-a4-field-layout":
            result.fieldLayout,

          "data-smart-a4-fits":
            String(result.fits),

          "data-smart-a4-overflow-px":
            String(
              result.overflowPx,
            ),

          "data-smart-a4-needs-overflow-page":
            String(
              result
                .needsOverflowPage,
            ),

          "data-smart-a4-signature-height-px":
            String(
              result
                .signatureHeightPx,
            ),

          "data-smart-a4-signature-reserved-px":
            String(
              result
                .signatureReservedPx,
            ),

          "data-smart-a4-dominant-role":
            result.dominantRole,

          "data-smart-a4-severity":
            result.severity,

          "data-smart-a4-candidate":
            result.candidateId,

          "data-smart-a4-score":
            String(
              result.score,
            ),
        }
      : {};

  return (
    <div
      ref={viewportRef}
      className={[
        "report-smart-a4-content relative",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={viewportStyle}
      data-report-density={
        result.mode
      }
      data-report-field-layout={
        result.fieldLayout
      }
      data-report-overflow={
        result.needsOverflowPage
          ? "minimum-overflow"
          : "fit"
      }
      data-smart-a4-overflow-px={
        result.overflowPx
      }
      data-smart-a4-dominant-role={
        result.dominantRole
      }
      data-smart-a4-severity={
        result.severity
      }
      data-smart-a4-candidate={
        result.candidateId
      }
      data-smart-a4-score={
        result.score
      }
      data-smart-a4-prefer-evidence-move={
        String(
          result
            .preferEvidenceMove,
        )
      }
      data-smart-a4-signature-reserved-px={
        result.signatureReservedPx
      }
      {...developmentDiagnostics}
    >
      <style>
        {SMART_A4_ENGINE_CSS}
      </style>

      <div
        ref={contentRef}
        className={[
          "min-h-full",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        data-report-smart-content
      >
        {children}
      </div>
    </div>
  );
}