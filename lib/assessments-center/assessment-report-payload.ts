import type { AssessmentAnalyticalReportData } from "@/components/assessments-center/report/assessment-analytical-report";

type Identity = { schoolName?: string | null; logoUrl?: string | null; principalName?: string | null; principalSignatureUrl?: string | null; educationDepartment?: string | null; educationOffice?: string | null; academicYear?: string | null; currentSemester?: string | null; };
type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue { return value && typeof value === "object" ? value as RecordValue : {}; }
function number(value: unknown): number | null { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function text(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function list(value: unknown): string[] { return Array.isArray(value) ? value.map((item) => { if (typeof item === "string") return item; if (item && typeof item === "object") return Object.values(item as Record<string, unknown>).flatMap((part) => Array.isArray(part) ? part : [part]).filter((part): part is string => typeof part === "string" && part.trim().length > 0).join(" — "); return ""; }).filter((item) => item.trim().length > 0) : []; }
function percent(value: number | null): number { return value === null ? 0 : Math.max(0, Math.min(100, value)); }

function aiSections(ai: RecordValue, studentNames: string[]) {
  const redact = (value: string) => studentNames.reduce((result, name) => name.length > 1 ? result.split(name).join("الطالب") : result, value);
  const redactedList = (value: unknown) => list(value).map(redact);
  return {
    executiveSummary: redact(text(ai.executiveSummary, "لم يتم توليد القراءة التحليلية بعد.")),
    strengths: redactedList(ai.strengths),
    improvementAreas: redactedList(Array.isArray(ai.weaknesses) && ai.weaknesses.length ? ai.weaknesses : ai.improvementPriorities),
    possibleCauses: redactedList(ai.possibleCauses),
    recommendations: redactedList(ai.recommendations),
    remedialPlan: redactedList(ai.remedialActions),
    enrichmentPlan: redactedList(ai.enrichmentActions),
    followUpIndicators: redactedList(ai.followUpIndicators),
    analyticalReading: redact(text(ai.analyticalReading)),
    finalConclusion: redact(text(ai.finalConclusion)),
  };
}

export function buildAssessmentAnalyticalReportData(snapshotValue: unknown, identity?: Identity, teacherName?: string | null, teacherSignatureUrl?: string | null): AssessmentAnalyticalReportData {
  const snapshot = record(snapshotValue);
  const stats = record(snapshot.statistics);
  const ai = record(snapshot.ai);
  const isMultiPeriod = Array.isArray(snapshot.periodMetrics);
  const maximumScore = number(snapshot.maximumScore ?? snapshot.totalScore) ?? 0;
  const students = Array.isArray(snapshot.students) ? snapshot.students.map(record) : [];
  const type = text(snapshot.type, "NAFS") as AssessmentAnalyticalReportData["analysisType"];
  const typeLabel = type === "MAHIROON" ? "اختبار ماهرون" : type === "SUBJECT_PERIODIC" ? "تحليل فصلي لمادة" : "اختبار نافس";

  const periods: AssessmentAnalyticalReportData["periods"] = isMultiPeriod
    ? (snapshot.periodMetrics as unknown[]).map((item) => { const period = record(item); return { id: text(period.periodId), label: text(period.label, "الفترة"), average: number(period.average) ?? 0, achievementRate: percent(number(period.achievementPercentage)) }; })
    : [
      { id: "PRE", label: "الاختبار القبلي", average: number(stats.preAverage) ?? 0, achievementRate: percent(number(stats.preAchievementPercentage)) },
      { id: "POST", label: "الاختبار البعدي", average: number(stats.postAverage) ?? 0, achievementRate: percent(number(stats.postAchievementPercentage)) },
    ];

  const latestPeriod = periods.at(-1);
  const latestAveragePercentage = latestPeriod?.average ?? 0;
  const latestScores = isMultiPeriod
    ? students.map((student) => number(record(student.scores)[text(latestPeriod?.id)])) .filter((value): value is number => value !== null)
    : students.map((student) => number(student.postScore)).filter((value): value is number => value !== null);
  const averageScore = maximumScore > 0 ? latestAveragePercentage / 100 * maximumScore : 0;
  const highestScore = latestScores.length ? Math.max(...latestScores) : number(stats.highestPost ?? stats.highestPre) ?? 0;
  const lowestScore = latestScores.length ? Math.min(...latestScores) : number(stats.lowestPost ?? stats.lowestPre) ?? 0;

  const directions = students.map((student) => text(student.direction));
  const improvedCount = isMultiPeriod ? directions.filter((value) => value === "IMPROVED").length : number(stats.improvedCount) ?? 0;
  const stableCount = isMultiPeriod ? directions.filter((value) => value === "UNCHANGED").length : number(stats.unchangedCount) ?? 0;
  const declinedCount = isMultiPeriod ? directions.filter((value) => value === "DECLINED").length : number(stats.declinedCount) ?? 0;
  const improvementRate = isMultiPeriod ? number(snapshot.firstToLastAverageChange) : number(stats.achievementChange);

  const latestPercentages = isMultiPeriod
    ? students.map((student) => { const score = number(record(student.scores)[text(latestPeriod?.id)]); return score === null || maximumScore <= 0 ? null : score / maximumScore * 100; })
    : students.map((student) => number(student.postPercentage));
  const levels = [
    ["مرتفع", (value: number) => value >= 80],
    ["متوسط", (value: number) => value >= 60 && value < 80],
    ["منخفض", (value: number) => value >= 40 && value < 60],
    ["منخفض جدًا", (value: number) => value < 40],
  ] as const;
  const performanceLevels = levels.map(([label, predicate]) => { const count = latestPercentages.filter((value): value is number => value !== null && predicate(value)).length; return { label, count, percentage: students.length ? count / students.length * 100 : 0 }; });

  const plan = Array.isArray(ai.developmentPlan) ? ai.developmentPlan.map(record).map((item) => ({
    domain: text(item.area || item.domain),
    need: text(item.need),
    action: text(item.action),
    method: text(item.method),
    duration: text(item.duration),
    responsible: text(item.responsible),
    indicator: text(item.indicator),
    target: text(item.target),
    component: text(item.component || item.element) || undefined,
    cause: text(item.cause) || undefined,
    objective: text(item.objective || item.goal) || undefined,
    steps: list(item.steps),
    resources: text(item.resources) || undefined,
    participants: text(item.participants) || undefined,
    followUpMethod: text(item.followUpMethod) || undefined,
    followUpTiming: text(item.followUpTiming) || undefined,
    evidence: text(item.evidence) || undefined,
  })) : [];
  const analysis = aiSections(ai, students.map((student) => text(student.studentName)).filter(Boolean));

  return {
    reportTitle: type === "NAFS" ? "تحليل نتائج نافس" : type === "MAHIROON" ? "تحليل نتائج اختبار ماهرون" : `تحليل نتائج مادة ${text(snapshot.subject, "")}`,
    reportSubtitle: type === "NAFS" ? "الاختبار القبلي والبعدي" : "تقرير تحليلي للنتائج والمؤشرات",
    analysisTypeLabel: typeLabel,
    analysisType: type,
    school: { name: identity?.schoolName || "مدرسة Teachix", educationAdministration: identity?.educationDepartment || undefined, educationOffice: identity?.educationOffice || undefined, principalName: identity?.principalName || undefined, teacherName: teacherName || undefined, teacherSignatureUrl: teacherSignatureUrl || undefined, principalSignatureUrl: identity?.principalSignatureUrl || undefined, logoUrl: identity?.logoUrl || undefined, ministryLogoUrl: "/uploads/school-logos/MOE.png" },
    metadata: { subject: text(snapshot.subject, "—"), grade: text(snapshot.grade, "—"), classroom: text(snapshot.classroom, "—"), academicYear: text(snapshot.academicYear, identity?.academicYear || ""), semester: text(snapshot.semester, identity?.currentSemester || ""), maximumScore, reportDate: new Intl.DateTimeFormat("ar-SA").format(new Date()) },
    metrics: { studentCount: students.length, averageScore, achievementRate: percent(latestPeriod?.achievementRate ?? number(stats.postAchievementPercentage)), highestScore, lowestScore, improvementRate: improvementRate ?? undefined, improvedCount, stableCount, declinedCount },
    periods,
    performanceLevels,
    analysis,
    developmentPlan: plan,
  };
}
