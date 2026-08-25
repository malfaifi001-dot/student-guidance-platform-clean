export type AnalysisPresentationMode =
  | "SINGLE_MEASUREMENT"
  | "PRE_POST"
  | "MULTI_PERIOD"
  | "MASTERY"
  | "SINGLE_STUDENT"
  | "SINGLE_STUDENT_COMPARISON"
  | "SINGLE_STUDENT_MULTI_PERIOD"
  | "GROUP_COMPARISON";

export type MeasurementAnalysisMode = "CURRENT_STATE" | "TWO_POINT" | "BASIC_TREND" | "MULTI_PERIOD" | "LONGITUDINAL";
export type AnalysisAudienceMode = "INDIVIDUAL" | "GROUP";
export type MeasurementScore = { studentKey: string; score: number };

export type AvailableMeasurement = {
  id: string;
  label: string;
  index: number;
  scores: MeasurementScore[];
  studentCount: number;
  averageScore: number;
  achievementPercentage: number;
  minScore: number;
  maxScore: number;
  medianScore: number;
  scoreRange: number;
  masteryCount: number;
  masteryPercentage: number;
  belowMasteryCount: number;
  averageGapFromMastery: number;
};

export type MeasurementTransition = { fromId: string; toId: string; fromLabel: string; toLabel: string; change: number };

export type MeasurementSeriesAnalysis = {
  transitions: MeasurementTransition[];
  matchedStudentCount: number;
  improvedCount: number;
  stableCount: number;
  declinedCount: number;
  firstToLastChange: number | null;
  largestIncrease: MeasurementTransition | null;
  largestDecrease: MeasurementTransition | null;
  bestMeasurement: AvailableMeasurement | null;
  weakestMeasurement: AvailableMeasurement | null;
  overallDirection: "صاعد" | "هابط" | "مستقر" | "متذبذب" | null;
  improvingTransitionsPercentage: number | null;
  volatility: number | null;
};

export type AnalysisPresentation = {
  mode: AnalysisPresentationMode;
  measurementMode: MeasurementAnalysisMode;
  audienceMode: AnalysisAudienceMode;
  periodCount: number;
  studentCount: number;
  scope: AnalysisAudienceMode;
  hasComparison: boolean;
  showTimeTrend: boolean;
  showMovement: boolean;
  showDistribution: boolean;
  availableMeasurements: AvailableMeasurement[];
  series: MeasurementSeriesAnalysis;
};

type SnapshotLike = Record<string, unknown>;

function record(value: unknown): SnapshotLike { return value && typeof value === "object" ? value as SnapshotLike : {}; }
function finite(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
  return null;
}
function round(value: number): number { return Math.round(value * 100) / 100; }
function scoreKey(student: SnapshotLike, index: number): string { return String(student.studentId ?? student.studentKey ?? student.id ?? student.studentName ?? `student-${index}`); }
function isNafs(snapshot: SnapshotLike): boolean { return snapshot.type === "NAFS" || snapshot.uploadMode === "NAFS" || snapshot.uploadMode === "NAFS_PRE_POST"; }
function scoreFor(student: SnapshotLike, id: string, index: number, legacyNafs: boolean): number | null {
  const scores = record(student.scores);
  let raw: unknown = scores[id];
  if (raw === undefined && id === "PRE") raw = student.preScore;
  if (raw === undefined && id === "POST") raw = student.postScore;
  if (raw === undefined && legacyNafs && index === 0) raw = student.preScore;
  if (raw === undefined && legacyNafs && index === 1) raw = student.postScore;
  return finite(raw);
}
function median(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2); }

function measurementDefinitions(snapshot: SnapshotLike): Array<{ id: string; label: string; index: number }> {
  const source = Array.isArray(snapshot.periodMetrics) && snapshot.periodMetrics.length
    ? snapshot.periodMetrics
    : Array.isArray(snapshot.measurements) && snapshot.measurements.length
      ? snapshot.measurements
      : Array.isArray(snapshot.periods) && snapshot.periods.length ? snapshot.periods : [];
  if (source.length) return source.map((item, index) => {
    const value = record(item);
    const fallback = record(Array.isArray(snapshot.periods) ? snapshot.periods[index] : undefined);
    return { id: String(value.periodId ?? value.measurementId ?? value.id ?? fallback.id ?? `M${index + 1}`), label: String(value.label ?? fallback.label ?? `القياس ${index + 1}`), index };
  });
  const students = Array.isArray(snapshot.students) ? snapshot.students.map(record) : [];
  const legacyNafs = isNafs(snapshot);
  if (legacyNafs) {
    const hasPre = students.some((student) => scoreFor(student, "PRE", 0, true) !== null);
    const hasPost = students.some((student) => scoreFor(student, "POST", 1, true) !== null);
    if (hasPre && hasPost) return [{ id: "PRE", label: "الاختبار القبلي", index: 0 }, { id: "POST", label: "الاختبار البعدي", index: 1 }];
    if (hasPre) return [{ id: "PRE", label: "الاختبار القبلي", index: 0 }];
    if (hasPost) return [{ id: "POST", label: "الاختبار البعدي", index: 1 }];
  }
  const scoreKeys = new Set<string>();
  students.forEach((student) => Object.keys(record(student.scores)).forEach((key) => scoreKeys.add(key)));
  return [...scoreKeys].map((id, index) => ({ id, label: `القياس ${index + 1}`, index }));
}

export function normalizeAvailableMeasurements(snapshotValue: unknown): AvailableMeasurement[] {
  const snapshot = record(snapshotValue);
  const students = Array.isArray(snapshot.students) ? snapshot.students.map(record) : [];
  const maximumScore = finite(snapshot.maximumScore ?? snapshot.totalScore) ?? 0;
  const legacyNafs = isNafs(snapshot);
  return measurementDefinitions(snapshot).flatMap((definition) => {
    const scores = students.flatMap((student, studentIndex) => {
      const score = scoreFor(student, definition.id, definition.index, legacyNafs);
      return score === null ? [] : [{ studentKey: scoreKey(student, studentIndex), score }];
    });
    if (!scores.length) return [];
    const values = scores.map((item) => item.score);
    const averageScore = round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const minScore = Math.min(...values), maxScore = Math.max(...values);
    const masteryThreshold = maximumScore > 0 ? maximumScore * 0.6 : null;
    const masteryCount = masteryThreshold === null ? 0 : values.filter((value) => value >= masteryThreshold).length;
    return [{
      id: definition.id, label: definition.label, index: definition.index, scores,
      studentCount: values.length, averageScore, achievementPercentage: maximumScore > 0 ? round(averageScore / maximumScore * 100) : 0,
      minScore, maxScore, medianScore: median(values), scoreRange: round(maxScore - minScore),
      masteryCount, masteryPercentage: values.length && masteryThreshold !== null ? round(masteryCount / values.length * 100) : 0,
      belowMasteryCount: masteryThreshold === null ? 0 : values.filter((value) => value < masteryThreshold).length,
      averageGapFromMastery: masteryThreshold === null ? 0 : round(values.reduce((sum, value) => sum + Math.max(0, masteryThreshold - value), 0) / values.length),
    }];
  });
}

export function resolveAnalysisMeasurements(snapshotValue: unknown): AvailableMeasurement[] { return normalizeAvailableMeasurements(snapshotValue); }

export function analyzeMeasurementSeries(measurements: AvailableMeasurement[]): MeasurementSeriesAnalysis {
  const transitions = measurements.slice(1).map((measurement, index) => {
    const previous = measurements[index];
    const previousByStudent = new Map(previous.scores.map((item) => [item.studentKey, item.score]));
    const currentByStudent = new Map(measurement.scores.map((item) => [item.studentKey, item.score]));
    const changes = [...currentByStudent].flatMap(([studentKey, score]) => previousByStudent.has(studentKey) ? [score - previousByStudent.get(studentKey)!] : []);
    return { fromId: previous.id, toId: measurement.id, fromLabel: previous.label, toLabel: measurement.label, change: changes.length ? round(changes.reduce((sum, value) => sum + value, 0) / changes.length) : 0, matchedCount: changes.length } as MeasurementTransition & { matchedCount: number };
  });
  const lastTransition = transitions.at(-1);
  const changes = transitions.map((item) => item.change);
  const firstToLastChange = measurements.length >= 2 ? round(measurements.at(-1)!.averageScore - measurements[0].averageScore) : null;
  const bestMeasurement = measurements.length ? measurements.reduce((best, item) => item.averageScore > best.averageScore ? item : best) : null;
  const weakestMeasurement = measurements.length ? measurements.reduce((weakest, item) => item.averageScore < weakest.averageScore ? item : weakest) : null;
  const positive = changes.filter((value) => value > 0).length, negative = changes.filter((value) => value < 0).length, stable = changes.filter((value) => value === 0).length;
  const overallDirection = !transitions.length ? null : positive && !negative ? "صاعد" : negative && !positive ? "هابط" : positive === 0 && negative === 0 ? "مستقر" : "متذبذب";
  const matchedStudentCount = lastTransition?.matchedCount ?? 0;
  const lastChanges = (() => {
    if (measurements.length < 2) return { improvedCount: 0, stableCount: 0, declinedCount: 0 };
    const previous = measurements.at(-2)!;
    const current = measurements.at(-1)!;
    const previousByStudent = new Map(previous.scores.map((item) => [item.studentKey, item.score]));
    const currentValues = current.scores.flatMap((item) => previousByStudent.has(item.studentKey) ? [item.score - previousByStudent.get(item.studentKey)!] : []);
    return { improvedCount: currentValues.filter((value) => value > 0).length, stableCount: currentValues.filter((value) => value === 0).length, declinedCount: currentValues.filter((value) => value < 0).length };
  })();
  return {
    transitions,
    matchedStudentCount,
    ...lastChanges,
    firstToLastChange,
    largestIncrease: transitions.filter((item) => item.change > 0).sort((a, b) => b.change - a.change)[0] ?? null,
    largestDecrease: transitions.filter((item) => item.change < 0).sort((a, b) => a.change - b.change)[0] ?? null,
    bestMeasurement, weakestMeasurement, overallDirection,
    improvingTransitionsPercentage: transitions.length ? round(positive / transitions.length * 100) : null,
    volatility: changes.length > 1 ? round(changes.reduce((sum, value, index) => sum + (index ? Math.abs(value - changes[index - 1]) : 0), 0) / Math.max(changes.length - 1, 1)) : 0,
  };
}

export function resolveAnalysisPresentation(snapshotValue: unknown): AnalysisPresentation {
  const availableMeasurements = normalizeAvailableMeasurements(snapshotValue);
  const measurementCount = availableMeasurements.length;
  const latest = availableMeasurements.at(-1);
  const studentCount = latest?.studentCount ?? 0;
  const individual = studentCount === 1;
  const measurementMode: MeasurementAnalysisMode = measurementCount <= 1 ? "CURRENT_STATE" : measurementCount === 2 ? "TWO_POINT" : measurementCount === 3 ? "BASIC_TREND" : measurementCount <= 6 ? "MULTI_PERIOD" : "LONGITUDINAL";
  const mode: AnalysisPresentationMode = measurementCount <= 1 ? (individual ? "SINGLE_STUDENT" : "SINGLE_MEASUREMENT") : measurementCount === 2 ? (individual ? "SINGLE_STUDENT_COMPARISON" : "PRE_POST") : individual ? "SINGLE_STUDENT_MULTI_PERIOD" : "MULTI_PERIOD";
  return { mode, measurementMode, audienceMode: individual ? "INDIVIDUAL" : "GROUP", periodCount: measurementCount, studentCount, scope: individual ? "INDIVIDUAL" : "GROUP", hasComparison: measurementCount >= 2, showTimeTrend: measurementCount >= 2, showMovement: measurementCount >= 2, showDistribution: !individual, availableMeasurements, series: analyzeMeasurementSeries(availableMeasurements) };
}
