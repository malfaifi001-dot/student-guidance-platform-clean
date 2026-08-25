export type AnalysisPresentationMode =
  | "SINGLE_MEASUREMENT"
  | "PRE_POST"
  | "MULTI_PERIOD"
  | "MASTERY"
  | "SINGLE_STUDENT"
  | "GROUP_COMPARISON";

export type AnalysisPresentation = {
  mode: AnalysisPresentationMode;
  periodCount: number;
  hasComparison: boolean;
  showTimeTrend: boolean;
  showMovement: boolean;
  showDistribution: boolean;
};

type SnapshotLike = Record<string, unknown>;

function record(value: unknown): SnapshotLike {
  return value && typeof value === "object" ? value as SnapshotLike : {};
}

function validNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function hasValue(values: unknown[]) {
  return values.some(validNumber);
}

export function resolveAnalysisPresentation(snapshotValue: unknown): AnalysisPresentation {
  const snapshot = record(snapshotValue);
  const students = Array.isArray(snapshot.students) ? snapshot.students.map(record) : [];
  const periodMetrics = Array.isArray(snapshot.periodMetrics) ? snapshot.periodMetrics : [];
  const stats = record(snapshot.statistics);
  const isMultiPeriod = periodMetrics.length > 0;
  const hasPre = validNumber(stats.preAverage) || students.some((student) => validNumber(student.preScore));
  const hasPost = validNumber(stats.postAverage) || students.some((student) => validNumber(student.postScore));
  const effectivePeriodCount = isMultiPeriod ? periodMetrics.length : Number(hasPre) + Number(hasPost);
  const singleStudent = students.length === 1;
  const comparison = isMultiPeriod ? periodMetrics.length >= 2 : hasPre && hasPost;

  let mode: AnalysisPresentationMode;
  if (singleStudent && effectivePeriodCount <= 1) mode = "SINGLE_STUDENT";
  else if (effectivePeriodCount <= 1) mode = "SINGLE_MEASUREMENT";
  else if (isMultiPeriod && periodMetrics.length >= 3) mode = "MULTI_PERIOD";
  else if (comparison) mode = "PRE_POST";
  else mode = "SINGLE_MEASUREMENT";

  return {
    mode,
    periodCount: isMultiPeriod ? periodMetrics.length : effectivePeriodCount,
    hasComparison: mode === "PRE_POST" || mode === "MULTI_PERIOD",
    showTimeTrend: mode === "PRE_POST" || mode === "MULTI_PERIOD",
    showMovement: mode === "PRE_POST" || mode === "MULTI_PERIOD",
    showDistribution: mode !== "SINGLE_STUDENT",
  };
}
