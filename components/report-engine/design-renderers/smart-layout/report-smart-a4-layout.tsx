"use client";

import {
  usePhysicalLayoutFrozenSettings,
} from "@/components/report-engine/physical-layout/physical-layout-frozen-context";

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
import {
  createSemanticInputFingerprint,
  getFingerprintPrefix,
  roundLayoutMetric,
  useReportSmartSemanticFingerprint,
} from "./report-smart-lifecycle";

type ReportSmartA4LifecyclePhase =
  | "MEASURING"
  | "STABILIZING"
  | "FROZEN";

const MAX_SMART_A4_MEASUREMENT_ATTEMPTS = 8;

export type ReportSmartA4LayoutResult = {
  mode: ReportSmartA4Mode;
  fieldLayout: ReportSmartA4FieldLayout;

  fits: boolean;
  needsOverflowPage: boolean;

  overflowPx: number;

  blockOverflowPx: number;
  scrollOverflowPx: number;
  boundingOverflowPx: number;
  mainContentOverflowPx: number;

  signatureHeightPx: number;
  signatureReservedPx: number;
  boundaryBottomPx: number;
  footerBoundaryUsed: boolean;

  dominantRole: ReportSmartA4BlockRole;
  severity: ReportSmartA4OverflowSeverity;

  candidateId: string;
  score: number;

  preferEvidenceMove: boolean;
};

type ReportSmartA4ContentRegionProps = {
  children: ReactNode;

  heightMm: number;
  footerSafeAreaMm?: number;

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

  blockOverflowPx: 0,
  scrollOverflowPx: 0,
  boundingOverflowPx: 0,
  mainContentOverflowPx: 0,

  signatureHeightPx: 0,
  signatureReservedPx: 0,
  boundaryBottomPx: 0,
  footerBoundaryUsed: false,

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
   * =========================================================
   * SMART FIELD RENDERER
   * =========================================================
   *
   * Elegant official information table.
   *
   * Goals:
   * - preserve the compact horizontal packing
   * - make labels/values immediately understandable
   * - avoid the previous card-heavy vertical footprint
   * - keep long/list fields readable
   */

  .report-smart-a4-content
  .report-smart-field-grid {
    display: grid !important;
    grid-template-columns:
      repeat(4, minmax(0, 1fr)) !important;

    align-items: stretch;

    overflow: hidden;

    border:
      1px solid
      #cbd5e1;

    border-radius:
      10px;

    background:
      #ffffff;

    gap: 0 !important;
  }

  .report-smart-a4-content
  .report-smart-field-item {
    min-width: 0;

    border-inline-start:
      1px solid
      #dbe4ec;

    border-bottom:
      1px solid
      #dbe4ec;

    background:
      #ffffff;
  }

  /*
   * Remove doubled outer borders visually.
   */
  .report-smart-a4-content
  .report-smart-field-item:nth-child(4n + 1) {
    border-inline-start: 0;
  }

  /*
   * ---------------------------------------------------------
   * FIELD WIDTH POLICY
   * ---------------------------------------------------------
   */

  .report-smart-a4-content
  .report-smart-field-item[data-smart-field-kind="short"] {
    grid-column: span 1;
  }

  .report-smart-a4-content
  .report-smart-field-item[data-smart-field-kind="medium"] {
    grid-column: span 2;
  }

  .report-smart-a4-content
  .report-smart-field-item[data-smart-field-kind="long"],
  .report-smart-a4-content
  .report-smart-field-item[data-smart-field-kind="list"] {
    grid-column: span 4;
  }

  /*
   * ---------------------------------------------------------
   * BASE CELL
   * ---------------------------------------------------------
   */

  .report-smart-a4-content
  .report-smart-meta-card {
    display: flex;
    flex-direction: column;

    height: 100%;
    min-height: 0;

    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;

    background:
      transparent !important;

    padding: 0 !important;
  }

  /*
   * Label becomes a small official header strip.
   */
  .report-smart-a4-content
  .report-smart-meta-label {
    display: flex;
    align-items: center;

    min-height:
      calc(
        21px *
        var(--report-field-spacing-scale, 1)
      );

    margin: 0 !important;

    padding-inline:
      calc(
        0.55rem *
        var(--report-field-spacing-scale, 1)
      );

    padding-block:
      calc(
        0.22rem *
        var(--report-field-spacing-scale, 1)
      );

    border-bottom:
      1px solid
      #edf1f5;

    background:
      #f8fafc;

    color:
      #64748b !important;

    font-weight: 800 !important;

    line-height: 1.25 !important;

    white-space: normal;
  }

  /*
   * Value area.
   */
  .report-smart-a4-content
  .report-smart-meta-value {
    display: flex;
    align-items: center;

    flex: 1 1 auto;

    min-height:
      calc(
        25px *
        var(--report-field-spacing-scale, 1)
      );

    margin: 0 !important;

    padding-inline:
      calc(
        0.55rem *
        var(--report-field-spacing-scale, 1)
      );

    padding-block:
      calc(
        0.28rem *
        var(--report-field-spacing-scale, 1)
      );

    color:
      #0f172a !important;

    font-weight: 800 !important;

    line-height:
      var(
        --report-content-line-height,
        1.5
      ) !important;

    overflow-wrap: anywhere;
  }

  /*
   * Lists stay stacked and readable.
   */
  .report-smart-a4-content
  .report-smart-meta-list {
    flex: 1 1 auto;

    margin: 0 !important;

    padding-inline:
      calc(
        0.55rem *
        var(--report-field-spacing-scale, 1)
      );

    padding-block:
      calc(
        0.3rem *
        var(--report-field-spacing-scale, 1)
      );

    color:
      #0f172a !important;
  }

  .report-smart-a4-content
  .report-smart-meta-list-item {
    line-height:
      1.45 !important;
  }

  .report-smart-a4-content
  .report-smart-meta-bullet {
    width: 4px !important;
    height: 4px !important;

    margin-top:
      0.55em !important;

    background:
      #0ea5a4 !important;
  }

  /*
   * ---------------------------------------------------------
   * PACKED
   * ---------------------------------------------------------
   *
   * Preferred default.
   * Formal table appearance with excellent space economy.
   */

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-smart-field-grid {
    border-color:
      #cbd5e1;
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-smart-meta-label {
    background:
      #f8fafc;

    min-height:
      calc(
        19px *
        var(--report-field-spacing-scale, 1)
      );
  }

  .report-smart-a4-content[data-report-field-layout="packed"]
  .report-smart-meta-value {
    min-height:
      calc(
        23px *
        var(--report-field-spacing-scale, 1)
      );
  }

  /*
   * ---------------------------------------------------------
   * COMFORTABLE
   * ---------------------------------------------------------
   *
   * Same table identity but slightly more breathing room.
   */

  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-smart-meta-label {
    min-height:
      calc(
        23px *
        var(--report-field-spacing-scale, 1)
      );

    padding-block:
      calc(
        0.32rem *
        var(--report-field-spacing-scale, 1)
      );
  }

  .report-smart-a4-content[data-report-field-layout="comfortable"]
  .report-smart-meta-value {
    min-height:
      calc(
        29px *
        var(--report-field-spacing-scale, 1)
      );

    padding-block:
      calc(
        0.4rem *
        var(--report-field-spacing-scale, 1)
      );
  }

  /*
   * ---------------------------------------------------------
   * INLINE
   * ---------------------------------------------------------
   *
   * Emergency high-density mode.
   *
   * Still looks like a proper table cell rather than loose text.
   * Short/medium fields display:
   *
   * label | value
   *
   * Long/list fields remain vertically stacked.
   */

  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="short"]
  .report-smart-meta-card,
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="medium"]
  .report-smart-meta-card {
    display: grid;

    grid-template-columns:
      minmax(64px, auto)
      minmax(0, 1fr);

    align-items: stretch;
  }

  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="short"]
  .report-smart-meta-label,
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="medium"]
  .report-smart-meta-label {
    min-height:
      calc(
        27px *
        var(--report-field-spacing-scale, 1)
      );

    border-bottom: 0;

    border-inline-end:
      1px solid
      #e2e8f0;

    background:
      #f8fafc;

    white-space: normal;
  }

  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="short"]
  .report-smart-meta-value,
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="medium"]
  .report-smart-meta-value {
    min-height:
      calc(
        27px *
        var(--report-field-spacing-scale, 1)
      );

    padding-block:
      calc(
        0.2rem *
        var(--report-field-spacing-scale, 1)
      );
  }

  /*
   * Long/list items remain stacked even in inline mode.
   */
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="long"]
  .report-smart-meta-card,
  .report-smart-a4-content[data-report-field-layout="inline"]
  .report-smart-field-item[data-smart-field-kind="list"]
  .report-smart-meta-card {
    display: flex;
    flex-direction: column;
  }

  /*
   * ---------------------------------------------------------
   * PRINT
   * ---------------------------------------------------------
   */

  @media print {
    .report-smart-a4-content
    .report-smart-field-grid {
      border-color:
        #b8c4cf;

      print-color-adjust:
        exact;

      -webkit-print-color-adjust:
        exact;
    }

    .report-smart-a4-content
    .report-smart-meta-label {
      background:
        #f3f6f8 !important;

      print-color-adjust:
        exact;

      -webkit-print-color-adjust:
        exact;
    }
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
    current.boundaryBottomPx === next.boundaryBottomPx &&
    current.footerBoundaryUsed === next.footerBoundaryUsed &&
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
  footerSafeAreaMm = 0,
  className = "",
  contentClassName = "",
  layoutKey,
  priorityMode = "signature",
  onLayoutResult,
}: ReportSmartA4ContentRegionProps) {
  const inheritedSemanticFingerprint =
    useReportSmartSemanticFingerprint();

  const semanticInputFingerprint =
    createSemanticInputFingerprint({
      inheritedSemanticFingerprint,
      heightMm,
      footerSafeAreaMm,
      layoutKey: layoutKey ?? null,
      priorityMode,
    });

  /**
   * إذا كانت الصفحة داخل Final Physical Renderer:
   *
   * لا نعيد Measurement.
   * لا نجرب Candidates.
   * لا نسمح لـ ResizeObserver بإعادة التخطيط.
   *
   * القرار اتخذه Physical Layout Engine مسبقًا.
   */
  const forcedPhysicalLayout =
    usePhysicalLayoutFrozenSettings();

  const forcedCandidate =
    forcedPhysicalLayout
      ? REPORT_SMART_A4_CANDIDATES.find(
          (candidate) =>
            candidate.id ===
            forcedPhysicalLayout.candidate,
        ) ||
        REPORT_SMART_A4_CANDIDATES.find(
          (candidate) =>
            candidate.mode ===
              forcedPhysicalLayout.density &&
            candidate.fieldLayout ===
              forcedPhysicalLayout.fieldLayout,
        ) ||
        REPORT_SMART_A4_CANDIDATES[0]
      : null;

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

  const scheduleMeasurementRef =
    useRef<() => void>(() => undefined);

  const runIdRef =
    useRef(0);

  const measuringRef =
    useRef(false);

  const frozenRef =
    useRef(false);

  const rerunRequestedRef =
    useRef(false);

  const fontsSettledRef =
    useRef(false);

  const settledAssetSourcesRef =
    useRef(new Set<string>());

  const resizeFingerprintRef =
    useRef("");

  const stabilizationRef = useRef({
    fingerprint: "",
    stablePasses: 0,
    attempts: 0,
  });

  const resultRef =
    useRef(INITIAL_RESULT);

  const onLayoutResultRef =
    useRef(onLayoutResult);

  const [result, setResult] =
    useState(INITIAL_RESULT);

  const [layoutPhase, setLayoutPhase] =
    useState<ReportSmartA4LifecyclePhase>("MEASURING");

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
        measuringRef.current ||
        frozenRef.current ||
        !fontsSettledRef.current ||
        forcedPhysicalLayout
      ) {
        return;
      }

      measuringRef.current = true;
      rerunRequestedRef.current = false;
      setLayoutPhase("MEASURING");

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

          blockOverflowPx:
            finalMeasurement
              .blockOverflowPx,

          scrollOverflowPx:
            finalMeasurement
              .scrollOverflowPx,

          boundingOverflowPx:
            finalMeasurement
              .boundingOverflowPx,

          mainContentOverflowPx:
            finalMeasurement
              .mainContentOverflowPx,

          signatureHeightPx:
            finalMeasurement
              .signatureHeightPx,

          signatureReservedPx:
            finalMeasurement
              .signatureReservedPx,

          boundaryBottomPx:
            finalMeasurement.boundaryBottomPx,

          footerBoundaryUsed:
            finalMeasurement.footerBoundaryUsed,

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

        const unsettledImages = Array.from(
          content.querySelectorAll<HTMLImageElement>("img"),
        ).filter((image) => !image.complete);

        if (unsettledImages.length > 0) {
          setLayoutPhase("MEASURING");
          return;
        }

        content
          .querySelectorAll<HTMLImageElement>("img")
          .forEach((image) => {
            const source = image.currentSrc || image.src;
            if (source) {
              settledAssetSourcesRef.current.add(source);
            }
          });

        const layoutResultFingerprint =
          createSemanticInputFingerprint({
            candidateId: nextResult.candidateId,
            dominantRole: nextResult.dominantRole,
            fieldLayout: nextResult.fieldLayout,
            fits: nextResult.fits,
            mode: nextResult.mode,
            overflowPx: roundLayoutMetric(nextResult.overflowPx),
            preferEvidenceMove: nextResult.preferEvidenceMove,
            signatureHeightPx: roundLayoutMetric(
              nextResult.signatureHeightPx,
            ),
            signatureReservedPx: roundLayoutMetric(
              nextResult.signatureReservedPx,
            ),
            boundaryBottomPx: roundLayoutMetric(
              nextResult.boundaryBottomPx,
            ),
            footerBoundaryUsed: nextResult.footerBoundaryUsed,
          });

        const previousStability = stabilizationRef.current;
        const stablePasses =
          previousStability.fingerprint === layoutResultFingerprint
            ? previousStability.stablePasses + 1
            : 1;
        const attempts = previousStability.attempts + 1;

        stabilizationRef.current = {
          fingerprint: layoutResultFingerprint,
          stablePasses,
          attempts,
        };

        if (process.env.NODE_ENV === "development") {
          viewport.dataset.smartA4LayoutFingerprint =
            getFingerprintPrefix(layoutResultFingerprint);
          viewport.dataset.smartA4StablePasses = String(stablePasses);
          viewport.dataset.smartA4Attempts = String(attempts);
        }

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

        if (
          stablePasses >= 2 ||
          attempts >= MAX_SMART_A4_MEASUREMENT_ATTEMPTS
        ) {
          frozenRef.current = true;
          rerunRequestedRef.current = false;
          setLayoutPhase("FROZEN");
        } else {
          rerunRequestedRef.current = true;
          setLayoutPhase("STABILIZING");
        }
      } finally {
        measuringRef.current =
          false;
      }
    }, [priorityMode, forcedPhysicalLayout]);

  const scheduleMeasurement =
    useCallback(() => {
      if (
        forcedPhysicalLayout ||
        frozenRef.current ||
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

            void runMeasurement().finally(() => {
              if (
                rerunRequestedRef.current &&
                !frozenRef.current
              ) {
                rerunRequestedRef.current = false;
                scheduleMeasurementRef.current();
              }
            });
          },
        );
    }, [runMeasurement, forcedPhysicalLayout]);

  useLayoutEffect(() => {
    scheduleMeasurementRef.current = scheduleMeasurement;

    return () => {
      scheduleMeasurementRef.current = () => undefined;
    };
  }, [scheduleMeasurement]);

  useLayoutEffect(() => {
    runIdRef.current += 1;

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

    /**
     * ========================================================
     * FINAL FROZEN MODE
     * ========================================================
     *
     * Physical Pagination Engine سبق أن:
     *
     * - قاس الصفحة.
     * - اختار candidate.
     * - ثبت density.
     * - ثبت field layout.
     *
     * لذلك هذه الصفحة Render-only.
     */
    if (
      forcedPhysicalLayout &&
      forcedCandidate
    ) {
      frozenRef.current =
        true;

      measuringRef.current =
        false;

      rerunRequestedRef.current =
        false;

      resizeFingerprintRef.current =
        "";

      const forcedResult:
        ReportSmartA4LayoutResult = {
        ...INITIAL_RESULT,

        mode:
          forcedCandidate.mode,

        fieldLayout:
          forcedCandidate.fieldLayout,

        fits:
          true,

        needsOverflowPage:
          false,

        overflowPx:
          0,

        candidateId:
          forcedCandidate.id,

        severity:
          "none",

        preferEvidenceMove:
          false,
      };

      resultRef.current =
        forcedResult;

      setResult(
        forcedResult,
      );

      setLayoutPhase(
        "FROZEN",
      );

      onLayoutResultRef.current?.(
        forcedResult,
      );

      return () => {
        runIdRef.current += 1;
      };
    }

    /**
     * ========================================================
     * MEASUREMENT MODE
     * ========================================================
     *
     * هذا المسار يستخدمه Hidden Measurement Runtime فقط.
     */
    frozenRef.current =
      false;

    rerunRequestedRef.current =
      false;

    resizeFingerprintRef.current =
      "";

    settledAssetSourcesRef.current.clear();

    stabilizationRef.current = {
      fingerprint: "",
      stablePasses: 0,
      attempts: 0,
    };

    resultRef.current =
      INITIAL_RESULT;

    setResult(
      INITIAL_RESULT,
    );

    setLayoutPhase(
      "MEASURING",
    );

    scheduleMeasurement();

    return () => {
      runIdRef.current += 1;

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
  }, [
    semanticInputFingerprint,
    scheduleMeasurement,
    forcedPhysicalLayout,
    forcedCandidate,
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

    const handleResize = () => {
      if (frozenRef.current) {
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const nextResizeFingerprint = [
        roundLayoutMetric(viewportRect.width),
        roundLayoutMetric(viewportRect.height),
        roundLayoutMetric(contentRect.width),
        roundLayoutMetric(contentRect.height),
        roundLayoutMetric(content.scrollHeight),
      ].join(":");

      if (resizeFingerprintRef.current === nextResizeFingerprint) {
        return;
      }

      resizeFingerprintRef.current = nextResizeFingerprint;
      scheduleMeasurement();
    };

    const resizeObserver =
      new ResizeObserver(handleResize);

    const mutationObserver =
      new MutationObserver(() => {
        if (frozenRef.current) {
          return;
        }

        scheduleMeasurement();
      });

    const handleLoadedAsset =
      (event: Event) => {
        if (frozenRef.current) {
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

    content.addEventListener(
      "error",
      handleLoadedAsset,
      true,
    );

    window.addEventListener(
      "resize",
      handleResize,
    );

    if (!document.fonts) {
      fontsSettledRef.current = true;
      scheduleMeasurement();
    } else if (fontsSettledRef.current) {
      scheduleMeasurement();
    } else {
      void document.fonts.ready
        .then(() => {
          if (!fontsSettledRef.current) {
            fontsSettledRef.current = true;
            scheduleMeasurement();
          }
        })
        .catch(() => {
          fontsSettledRef.current = true;
          scheduleMeasurement();
        });
    }

    return () => {
      runIdRef.current += 1;

      resizeObserver.disconnect();
      mutationObserver.disconnect();

      content.removeEventListener(
        "load",
        handleLoadedAsset,
        true,
      );

      content.removeEventListener(
        "error",
        handleLoadedAsset,
        true,
      );

      window.removeEventListener(
        "resize",
        handleResize,
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
  }, [scheduleMeasurement, semanticInputFingerprint]);

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
          "data-smart-a4-semantic-fingerprint":
            getFingerprintPrefix(semanticInputFingerprint),

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

          "data-smart-a4-boundary-bottom-px":
            String(result.boundaryBottomPx),

          "data-smart-a4-footer-boundary-used":
            String(result.footerBoundaryUsed),

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
      data-smart-a4-block-overflow-px={
        result.blockOverflowPx
      }
      data-smart-a4-scroll-overflow-px={
        result.scrollOverflowPx
      }
      data-smart-a4-bounding-overflow-px={
        result.boundingOverflowPx
      }
      data-smart-a4-main-content-overflow-px={
        result.mainContentOverflowPx
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
      data-smart-a4-boundary-bottom-px={result.boundaryBottomPx}
      data-smart-a4-footer-boundary-used={String(result.footerBoundaryUsed)}
      data-report-footer-safe-area-mm={footerSafeAreaMm}
      data-smart-a4-phase={layoutPhase}
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
        data-report-smart-visual-ready={
          layoutPhase === "FROZEN"
            ? "true"
            : "false"
        }
        style={{
          /*
           * Smart A4 يجرب عدة Candidates على نفس DOM.
           *
           * القياس يبقى فعالًا بالكامل، لكن لا نعرض للمستخدم
           * الحالات الوسيطة حتى تصل النتيجة إلى FROZEN.
           *
           * opacity لا يغير أبعاد DOM، لذلك القياس الحقيقي
           * يبقى مطابقًا تمامًا.
           */
          opacity:
            forcedPhysicalLayout ||
            layoutPhase === "FROZEN"
              ? 1
              : 0,

          /*
           * لا Transition هنا عمدًا.
           * نريد Commit واحد مباشر وليس Fade أثناء الطباعة/المعاينة.
           */
          transition: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
