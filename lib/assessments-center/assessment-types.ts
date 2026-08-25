export type AssessmentAnalysisType = "NAFS" | "MAHIROON" | "SUBJECT_PERIODIC";
export type AssessmentPeriod = { id: string; label: string; order: number; date?: string | null };
export type PeriodScoreRow = { studentId: string | null; studentName: string; grade?: string | null; classroom?: string | null; scores: Record<string, number | null> };
export type MultiPeriodInput = { type: AssessmentAnalysisType; title: string; subject: string; grade: string; classroom: string; maximumScore: number; inputMode?: "manual" | "excel"; periods: AssessmentPeriod[]; students: PeriodScoreRow[]; semester?: string; academicYear?: string };
export type PeriodMetrics = { periodId: string; label: string; average: number | null; achievementPercentage: number | null; highest: number | null; lowest: number | null; fullScoreCount: number; count: number };
export type MultiPeriodStudent = PeriodScoreRow & { firstToLastChange: number | null; direction: "IMPROVED" | "DECLINED" | "UNCHANGED" };
export type MultiPeriodSnapshot = Omit<MultiPeriodInput, "students"> & { periodMetrics: PeriodMetrics[]; students: MultiPeriodStudent[]; firstToLastAverageChange: number | null; ai?: Record<string, unknown> | null; aiMeta?: Record<string, unknown> | null };

export const ANALYSIS_TYPE_CONFIG: Record<AssessmentAnalysisType, { label: string; defaultPeriods: Array<{ id: string; label: string }>; allowPeriodEdit: boolean }> = {
  NAFS: { label: "اختبار نافس", defaultPeriods: [{ id: "PRE", label: "الاختبار القبلي" }, { id: "POST", label: "الاختبار البعدي" }], allowPeriodEdit: false },
  MAHIROON: { label: "اختبار ماهرون", defaultPeriods: [{ id: "P1", label: "الفترة الأولى" }, { id: "P2", label: "الفترة الثانية" }], allowPeriodEdit: true },
  SUBJECT_PERIODIC: { label: "تحليل فصلي لمادة", defaultPeriods: [{ id: "P1", label: "الفترة الأولى" }], allowPeriodEdit: true },
};
