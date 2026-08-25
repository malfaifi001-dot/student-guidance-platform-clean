import type { NafsAnalysisInput, NafsBandDistribution, NafsImprovementCategory, NafsStudentResult, NafsStatistics } from "./nafs-types";

export const NAFS_BANDS = { high: 80, medium: 60, low: 40 } as const;

function finite(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round(value: number | null) {
  return value === null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100;
}

function percentage(score: number | null, totalScore: number) {
  return score === null || totalScore <= 0 ? null : round((score / totalScore) * 100);
}

function band(value: number | null): keyof NafsBandDistribution | null {
  if (value === null) return null;
  if (value >= NAFS_BANDS.high) return "HIGH";
  if (value >= NAFS_BANDS.medium) return "MEDIUM";
  if (value >= NAFS_BANDS.low) return "LOW";
  return "VERY_LOW";
}

function category(difference: number | null): NafsImprovementCategory {
  if (difference === null) return "STABLE";
  if (difference >= 20) return "HIGH";
  if (difference >= 5) return "IMPROVED";
  if (difference > 0) return "LIMITED";
  if (difference === 0) return "STABLE";
  return "DECLINED";
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length) : null;
}

export function calculateNafsAnalysis(input: NafsAnalysisInput): { students: NafsStudentResult[]; statistics: NafsStatistics } {
  const totalScore = input.totalScore;
  const students = input.students.map((student) => {
    const preScore = finite(student.preScore);
    const postScore = finite(student.postScore);
    const prePercentage = percentage(preScore, totalScore);
    const postPercentage = percentage(postScore, totalScore);
    const scoreDifference = preScore === null || postScore === null ? null : round(postScore - preScore);
    const percentagePointDifference = prePercentage === null || postPercentage === null ? null : round(postPercentage - prePercentage);
    const relativeChange = prePercentage === null || prePercentage === 0 || percentagePointDifference === null ? null : round((percentagePointDifference / prePercentage) * 100);
    const direction: NafsStudentResult["direction"] = scoreDifference === null ? "UNCHANGED" : scoreDifference > 0 ? "IMPROVED" : scoreDifference < 0 ? "DECLINED" : "UNCHANGED";
    return { ...student, preScore, postScore, prePercentage, postPercentage, scoreDifference, percentagePointDifference, relativeChange, direction, category: category(percentagePointDifference) };
  });
  const differences = students.map((student) => student.percentagePointDifference);
  const prePercentages = students.map((student) => student.prePercentage);
  const postPercentages = students.map((student) => student.postPercentage);
  const bands: NafsBandDistribution = { HIGH: { pre: 0, post: 0 }, MEDIUM: { pre: 0, post: 0 }, LOW: { pre: 0, post: 0 }, VERY_LOW: { pre: 0, post: 0 } };
  students.forEach((student) => { const preBand = band(student.prePercentage); const postBand = band(student.postPercentage); if (preBand) bands[preBand].pre += 1; if (postBand) bands[postBand].post += 1; });
  const improvedCount = students.filter((student) => student.direction === "IMPROVED").length;
  const declinedCount = students.filter((student) => student.direction === "DECLINED").length;
  const unchangedCount = students.length - improvedCount - declinedCount;
  return { students, statistics: {
    studentCount: students.length,
    preAverage: average(prePercentages), postAverage: average(postPercentages), averageImprovement: average(differences),
    preAchievementPercentage: prePercentages.length ? round(prePercentages.filter((value) => value !== null && value >= 60).length / students.length * 100) : null,
    postAchievementPercentage: postPercentages.length ? round(postPercentages.filter((value) => value !== null && value >= 60).length / students.length * 100) : null,
    achievementChange: average(postPercentages) === null || average(prePercentages) === null ? null : round(average(postPercentages)! - average(prePercentages)!),
    highestPre: Math.max(...students.map((student) => student.preScore ?? Number.NEGATIVE_INFINITY)) === Number.NEGATIVE_INFINITY ? null : Math.max(...students.map((student) => student.preScore ?? Number.NEGATIVE_INFINITY)),
    highestPost: Math.max(...students.map((student) => student.postScore ?? Number.NEGATIVE_INFINITY)) === Number.NEGATIVE_INFINITY ? null : Math.max(...students.map((student) => student.postScore ?? Number.NEGATIVE_INFINITY)),
    lowestPre: (() => { const values = students.filter((student) => student.preScore !== null).map((student) => student.preScore!); return values.length ? Math.min(...values) : null; })(),
    lowestPost: (() => { const values = students.filter((student) => student.postScore !== null).map((student) => student.postScore!); return values.length ? Math.min(...values) : null; })(),
    improvedCount, unchangedCount, declinedCount,
    improvedPercentage: students.length ? round(improvedCount / students.length * 100) || 0 : 0,
    declinedPercentage: students.length ? round(declinedCount / students.length * 100) || 0 : 0,
    bands,
  } };
}
