import type { MultiPeriodInput, MultiPeriodSnapshot, PeriodMetrics } from "./assessment-types";

function safe(value: number | null) { return value === null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100; }
function avg(values: Array<number | null>) { const valid = values.filter((value): value is number => value !== null && Number.isFinite(value)); return valid.length ? safe(valid.reduce((sum, value) => sum + value, 0) / valid.length) : null; }

export function calculateMultiPeriod(input: MultiPeriodInput): MultiPeriodSnapshot {
  if (!Number.isFinite(input.maximumScore) || input.maximumScore <= 0) throw new Error("INVALID_MAXIMUM_SCORE");
  if (!input.periods.length || input.periods.length > 20) throw new Error("INVALID_PERIODS");
  const periodMetrics: PeriodMetrics[] = input.periods.map((period) => { const values = input.students.map((student) => student.scores[period.id]); const percentages = values.map((value) => value === null || value === undefined ? null : value / input.maximumScore * 100); const valid = values.filter((value): value is number => value !== null && Number.isFinite(value)); return { periodId: period.id, label: period.label, average: avg(percentages), achievementPercentage: percentages.length ? safe(percentages.filter((value) => value !== null && value >= 60).length / input.students.length * 100) : null, highest: valid.length ? Math.max(...valid) : null, lowest: valid.length ? Math.min(...valid) : null, fullScoreCount: valid.filter((value) => value === input.maximumScore).length, count: valid.length }; });
  const first = input.periods[0]?.id; const last = input.periods[input.periods.length - 1]?.id;
  const students = input.students.map((student) => { const firstScore = first ? student.scores[first] : null; const lastScore = last ? student.scores[last] : null; const change = firstScore === null || firstScore === undefined || lastScore === null || lastScore === undefined ? null : safe((lastScore / input.maximumScore * 100) - (firstScore / input.maximumScore * 100)); return { ...student, firstToLastChange: change, direction: change === null || change === 0 ? "UNCHANGED" as const : change > 0 ? "IMPROVED" as const : "DECLINED" as const }; });
  const firstMetric = periodMetrics[0]?.average ?? null; const lastMetric = periodMetrics[periodMetrics.length - 1]?.average ?? null;
  return { ...input, periodMetrics, students, firstToLastAverageChange: firstMetric === null || lastMetric === null ? null : safe(lastMetric - firstMetric) };
}
