import type { AssessmentAnalyticalReportData } from "@/components/assessments-center/report/assessment-analytical-report";
import { getAssessmentAudienceLabels } from "@/lib/students/student-audience-labels";
import { resolveAnalysisPresentation } from "@/lib/assessments-center/analysis-presentation";

type Identity = { schoolName?: string | null; logoUrl?: string | null; principalName?: string | null; principalSignatureUrl?: string | null; educationDepartment?: string | null; educationOffice?: string | null; academicYear?: string | null; currentSemester?: string | null; gender?: string | null };
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue { return value && typeof value === "object" ? value as RecordValue : {}; }
function number(value: unknown): number | null { if (typeof value === "number") return Number.isFinite(value) ? value : null; if (typeof value === "string" && value.trim()) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; } return null; }
function text(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function list(value: unknown): string[] { return Array.isArray(value) ? value.map((item) => { if (typeof item === "string") return item; if (item && typeof item === "object") return Object.values(item as Record<string, unknown>).flatMap((part) => Array.isArray(part) ? part : [part]).filter((part): part is string => typeof part === "string" && part.trim().length > 0).join(" — "); return ""; }).filter((item): item is string => Boolean(item)) : []; }
function percent(value: number | null): number { return value === null ? 0 : Math.max(0, Math.min(100, value)); }

export function buildAssessmentPerformanceLevels(values: number[], maximumScore: number) {
  const percentages = maximumScore > 0 ? values.map((value) => value / maximumScore * 100) : [];
  const levels = [["مرتفع", (value: number) => value >= 80], ["متوسط", (value: number) => value >= 60 && value < 80], ["منخفض", (value: number) => value >= 40 && value < 60], ["منخفض جدًا", (value: number) => value < 40]] as const;
  return levels.map(([label, predicate]) => {
    const count = percentages.filter(predicate).length;
    return { label, count, percentage: percentages.length ? count / percentages.length * 100 : 0 };
  });
}

function aiSections(ai: RecordValue, studentNames: string[]) {
  const redact = (value: string) => studentNames.reduce((result, name) => name.length > 1 ? result.split(name).join("الطالب") : result, value);
  const redactedList = (value: unknown) => list(value).map(redact);
  return {
    executiveSummary: redact(text(ai.executiveSummary, "لم يتم توليد القراءة التحليلية بعد.")),
    strengths: redactedList(ai.strengths), improvementAreas: redactedList(Array.isArray(ai.weaknesses) && ai.weaknesses.length ? ai.weaknesses : ai.improvementPriorities),
    possibleCauses: redactedList(ai.possibleCauses), recommendations: redactedList(ai.recommendations), remedialPlan: redactedList(ai.remedialActions), enrichmentPlan: redactedList(ai.enrichmentActions), followUpIndicators: redactedList(ai.followUpIndicators), analyticalReading: redact(text(ai.analyticalReading)), finalConclusion: redact(text(ai.finalConclusion)),
  };
}

export function buildAssessmentAnalyticalReportData(snapshotValue: unknown, identity?: Identity, teacherName?: string | null, teacherSignatureUrl?: string | null, gender?: string | null): AssessmentAnalyticalReportData {
  const snapshot = record(snapshotValue);
  const stats = record(snapshot.statistics);
  const ai = record(snapshot.ai);
  const maximumScore = number(snapshot.maximumScore ?? snapshot.totalScore) ?? 0;
  const students = Array.isArray(snapshot.students) ? snapshot.students.map(record) : [];
  const type = text(snapshot.type, "NAFS") as AssessmentAnalyticalReportData["analysisType"];
  const typeLabel = type === "MAHIROON" ? "اختبار ماهرون" : type === "SUBJECT_PERIODIC" ? "تحليل فصلي لمادة" : "اختبار نافس";
  const presentation = resolveAnalysisPresentation(snapshot);
  const available = presentation.availableMeasurements;
  const periods = available.map((measurement) => ({ id: measurement.id, label: measurement.label, average: maximumScore > 0 ? measurement.averageScore / maximumScore * 100 : 0, achievementRate: measurement.achievementPercentage }));
  const latest = available.at(-1);
  const latestValues = latest?.scores.map((item) => item.score) ?? [];
  const averageScore = latest?.averageScore ?? number(stats.postAverage) ?? number(stats.preAverage) ?? 0;
  const highestScore = latest?.maxScore ?? number(stats.highestPost) ?? number(stats.highestPre) ?? 0;
  const lowestScore = latest?.minScore ?? number(stats.lowestPost) ?? number(stats.lowestPre) ?? 0;
  const performanceLevels = buildAssessmentPerformanceLevels(latestValues, maximumScore);
  const dominantLevel = performanceLevels.reduce<{ label: string; count: number } | null>((best, item) => !best || item.count > best.count ? item : best, null);
  const series = presentation.series;
  const deterministicSummary = presentation.measurementMode === "CURRENT_STATE" && latest
    ? `يشير القياس الحالي إلى متوسط ${averageScore.toFixed(1)} من ${maximumScore}. تتركز النتائج في مستوى ${dominantLevel?.label || "غير محدد"}، وتبلغ نسبة التحصيل ${latest.achievementPercentage.toFixed(1)}%.`
    : text(ai.executiveSummary, "لم يتم توليد القراءة التحليلية بعد.");
  const analysis = { ...aiSections(ai, students.map((student) => text(student.studentName)).filter(Boolean)), executiveSummary: deterministicSummary };
  const audience = getAssessmentAudienceLabels(gender);
  const reportSubtitle = presentation.periodCount === 1 ? "تحليل الأداء الحالي" : presentation.periodCount === 2 ? `${periods[0]?.label || "القياس الأول"} و${periods[1]?.label || "القياس الثاني"}` : "تحليل الاتجاه عبر القياسات";
  return {
    studentAudience: audience.students as "الطلاب" | "الطالبات", presentation,
    reportTitle: type === "NAFS" ? `تحليل نتائج نافس لـ${audience.students}` : type === "MAHIROON" ? `تحليل نتائج اختبار ماهرون لـ${audience.students}` : `تحليل نتائج مادة ${text(snapshot.subject, "")} لـ${audience.students}`,
    reportSubtitle, analysisTypeLabel: typeLabel, analysisType: type,
    school: { name: identity?.schoolName || "مدرسة Teachix", educationAdministration: identity?.educationDepartment || undefined, educationOffice: identity?.educationOffice || undefined, principalName: identity?.principalName || undefined, teacherName: teacherName || undefined, teacherSignatureUrl: teacherSignatureUrl || undefined, principalSignatureUrl: identity?.principalSignatureUrl || undefined, logoUrl: identity?.logoUrl || undefined, ministryLogoUrl: "/uploads/school-logos/MOE.png" },
    metadata: { subject: text(snapshot.subject, "—"), grade: text(snapshot.grade, "—"), classroom: text(snapshot.classroom, "—"), academicYear: text(snapshot.academicYear).trim() || text(identity?.academicYear).trim() || "1448-1449", semester: text(snapshot.semester).trim() || text(identity?.currentSemester).trim() || "الفصل الدراسي الأول", maximumScore, reportDate: new Intl.DateTimeFormat("ar-SA").format(new Date()) },
    metrics: { studentCount: presentation.studentCount, averageScore, achievementRate: latest?.achievementPercentage ?? percent(number(stats.postAchievementPercentage) ?? number(stats.preAchievementPercentage)), highestScore, lowestScore, scoreRange: latest?.scoreRange ?? Math.max(0, highestScore - lowestScore), medianScore: latest?.medianScore, masteryCount: latest?.masteryCount, masteryPercentage: latest?.masteryPercentage, belowMasteryCount: latest?.belowMasteryCount, improvementRate: presentation.hasComparison ? (series.firstToLastChange ?? undefined) : undefined, improvedCount: presentation.hasComparison ? series.improvedCount : undefined, stableCount: presentation.hasComparison ? series.stableCount : undefined, declinedCount: presentation.hasComparison ? series.declinedCount : undefined, dominantLevel: dominantLevel?.label, matchedStudentCount: series.matchedStudentCount },
    periods, performanceLevels, analysis, developmentPlan: Array.isArray(ai.developmentPlan) ? ai.developmentPlan.map(record).map((item) => ({ domain: text(item.area || item.domain), need: text(item.need), action: text(item.action), method: text(item.method), duration: text(item.duration), responsible: text(item.responsible), indicator: text(item.indicator), target: text(item.target), component: text(item.component || item.element) || undefined, cause: text(item.cause) || undefined, objective: text(item.objective || item.goal) || undefined, steps: list(item.steps), resources: text(item.resources) || undefined, participants: text(item.participants) || undefined, followUpMethod: text(item.followUpMethod) || undefined, followUpTiming: text(item.followUpTiming) || undefined, evidence: text(item.evidence) || undefined })) : [],
  };
}
