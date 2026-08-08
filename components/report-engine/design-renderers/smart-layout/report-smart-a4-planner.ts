import type {
  ReportSmartA4Mode,
  ReportSmartA4Profile,
} from "./report-smart-a4-config";

import type {
  ReportSmartA4BlockRole,
  ReportSmartA4Measurement,
} from "./report-smart-a4-measure";

export type ReportSmartA4FieldLayout =
  | "comfortable"
  | "packed"
  | "inline";

export type ReportSmartA4OverflowSeverity =
  | "none"
  | "tiny"
  | "small"
  | "medium"
  | "large";

export type ReportSmartA4Candidate = {
  id: string;
  mode: ReportSmartA4Mode;
  fieldLayout: ReportSmartA4FieldLayout;
};

export type ReportSmartA4EvaluatedCandidate = {
  candidate: ReportSmartA4Candidate;
  profile: ReportSmartA4Profile;
  measurement: ReportSmartA4Measurement;
  score: number;
};

export type ReportSmartA4Plan = {
  candidateId: string;

  mode: ReportSmartA4Mode;
  fieldLayout: ReportSmartA4FieldLayout;

  fits: boolean;
  score: number;

  severity: ReportSmartA4OverflowSeverity;
  dominantRole: ReportSmartA4BlockRole;

  overflowPx: number;

  preferEvidenceMove: boolean;
};

/*
 * ترتيب التجربة مقصود:
 *
 * 1. نحافظ على typography الطبيعية.
 * 2. نعيد توزيع الحقول أولًا.
 * 3. نقلل فراغات الحقول أكثر.
 * 4. بعدها فقط نبدأ بتقليل كثافة النص العامة.
 *
 * لا نحتاج 12 خطة لأن هذا سيجعل ResizeObserver مكلفًا جدًا.
 */
export const REPORT_SMART_A4_CANDIDATES:
  readonly ReportSmartA4Candidate[] = [
  {
    id: "normal-comfortable",
    mode: "normal",
    fieldLayout: "comfortable",
  },
  {
    id: "normal-packed",
    mode: "normal",
    fieldLayout: "packed",
  },
  {
    id: "normal-inline",
    mode: "normal",
    fieldLayout: "inline",
  },
  {
    id: "compact-packed",
    mode: "compact",
    fieldLayout: "packed",
  },
  {
    id: "compact-inline",
    mode: "compact",
    fieldLayout: "inline",
  },
  {
    id: "dense-inline",
    mode: "dense",
    fieldLayout: "inline",
  },
  {
    id: "minimum-safe-inline",
    mode: "minimum-safe",
    fieldLayout: "inline",
  },
] as const;

export function getReportSmartA4OverflowSeverity(
  overflowPx: number,
): ReportSmartA4OverflowSeverity {
  if (overflowPx <= 2) return "none";
  if (overflowPx <= 12) return "tiny";
  if (overflowPx <= 48) return "small";
  if (overflowPx <= 120) return "medium";
  return "large";
}

function getModeReadabilityScore(
  mode: ReportSmartA4Mode,
) {
  switch (mode) {
    case "normal":
      return 100;

    case "compact":
      return 88;

    case "dense":
      return 69;

    case "minimum-safe":
      return 50;

    default:
      return 50;
  }
}

function getFieldLayoutScore(
  layout: ReportSmartA4FieldLayout,
) {
  switch (layout) {
    case "comfortable":
      return 0;

    case "packed":
      return -3;

    case "inline":
      return -7;

    default:
      return -10;
  }
}

export function scoreReportSmartA4Candidate(
  candidate: ReportSmartA4Candidate,
  measurement: ReportSmartA4Measurement,
) {
  const fitScore =
    measurement.fits ? 1000 : 0;

  const readability =
    getModeReadabilityScore(
      candidate.mode,
    );

  const fieldLayoutScore =
    getFieldLayoutScore(
      candidate.fieldLayout,
    );

  /*
   * إذا الخطة لا تدخل الصفحة نعاقب مقدار overflow.
   * هذا يسمح باختيار أقرب خطة آمنة في حالة عدم نجاح أي خطة.
   */
  const overflowPenalty =
    Math.min(
      700,
      measurement.overflowPx * 2.2,
    );

  /*
   * إذا الحقول تستهلك جزءًا كبيرًا من الصفحة،
   * packed/inline يصبحان أكثر منطقية.
   */
  const fieldRatio =
    measurement.fieldHeightPx /
    Math.max(
      1,
      measurement.viewportHeightPx,
    );

  const fieldEfficiencyBonus =
    fieldRatio >= 0.28 &&
    candidate.fieldLayout !==
      "comfortable"
      ? 5
      : 0;

  return (
    fitScore +
    readability +
    fieldLayoutScore +
    fieldEfficiencyBonus -
    overflowPenalty
  );
}

export function chooseReportSmartA4Plan(
  evaluated:
    ReportSmartA4EvaluatedCandidate[],
): ReportSmartA4Plan {
  if (!evaluated.length) {
    return {
      candidateId:
        "minimum-safe-inline",

      mode: "minimum-safe",
      fieldLayout: "inline",

      fits: false,
      score: 0,

      severity: "large",
      dominantRole: "general",

      overflowPx: 0,

      preferEvidenceMove: false,
    };
  }

  const fitting =
    evaluated.filter(
      (item) =>
        item.measurement.fits,
    );

  const pool =
    fitting.length
      ? fitting
      : evaluated;

  const selected = [...pool].sort(
    (a, b) => b.score - a.score,
  )[0];

  const measurement =
    selected.measurement;

  const severity =
    getReportSmartA4OverflowSeverity(
      measurement.overflowPx,
    );

  /*
   * إذا التقرير لا يدخل إلا بعد dense/minimum-safe
   * بينما يوجد شاهد في الصفحة، نفضل نقل الشاهد أولًا.
   *
   * هذا هو التغيير المهم:
   * جودة النص والتوقيع أعلى أولوية من إبقاء كل الصور
   * في الصفحة الرئيسية.
   */
  const aggressiveDensity =
    selected.candidate.mode ===
      "dense" ||
    selected.candidate.mode ===
      "minimum-safe";

  const hasEvidence =
    measurement.evidenceHeightPx > 0;

  const preferEvidenceMove =
    hasEvidence &&
    (
      !measurement.fits ||
      aggressiveDensity
    );

  return {
    candidateId:
      selected.candidate.id,

    mode:
      selected.candidate.mode,

    fieldLayout:
      selected.candidate
        .fieldLayout,

    fits:
      measurement.fits,

    score:
      Math.round(
        selected.score * 10,
      ) / 10,

    severity,

    dominantRole:
      measurement.dominantRole,

    overflowPx:
      measurement.overflowPx,

    preferEvidenceMove,
  };
}