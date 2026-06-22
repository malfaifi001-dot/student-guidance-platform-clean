"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  buildAssessmentAnalysisSummary,
  buildStudentPerformanceSummaries,
  getAssessmentStudentKey,
  getGradeBandLabel,
} from "@/lib/assessment-center/assessment-analysis-summary";
import type {
  AssessmentAnalysisSummary,
  AssessmentResultRow,
  AssessmentStudentPerformanceSummary,
} from "@/lib/assessment-center/assessment-center-types";

type AnalysisItem = {
  id: string;
  title: string;
  createdAt: Date | string;
  averagePercentage?: number | null;
  summaryJson?: unknown;
  rowsJson?: unknown;
};

type Props = {
  analyses: AnalysisItem[];
  initialFirstId?: string;
  initialSecondId?: string;
};

type StudentDelta = AssessmentStudentPerformanceSummary & {
  delta: number;
};

function asRows(value: unknown) {
  if (!Array.isArray(value)) return [] as AssessmentResultRow[];
  return value as AssessmentResultRow[];
}

function asSummary(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as AssessmentAnalysisSummary;
}

function mergeSummary(
  summary: AssessmentAnalysisSummary | null,
  rows: AssessmentResultRow[],
) {
  const fallback = buildAssessmentAnalysisSummary(rows);

  if (!summary) return fallback;

  return {
    ...fallback,
    ...summary,
    weakStudents:
      summary.weakStudents && summary.weakStudents.length
        ? summary.weakStudents
        : fallback.weakStudents,
    excellentStudentsList:
      summary.excellentStudentsList && summary.excellentStudentsList.length
        ? summary.excellentStudentsList
        : fallback.excellentStudentsList,
    subjectGradeDistribution:
      summary.subjectGradeDistribution && summary.subjectGradeDistribution.length
        ? summary.subjectGradeDistribution
        : fallback.subjectGradeDistribution,
    strongestSubjects:
      summary.strongestSubjects && summary.strongestSubjects.length
        ? summary.strongestSubjects
        : fallback.strongestSubjects,
    weakestSubjects:
      summary.weakestSubjects && summary.weakestSubjects.length
        ? summary.weakestSubjects
        : fallback.weakestSubjects,
  };
}

function getWeakCount(summary: AssessmentAnalysisSummary) {
  return summary.weakStudents?.length || summary.riskStudentsCount || 0;
}

function getExcellentCount(summary: AssessmentAnalysisSummary) {
  return summary.excellentStudentsList?.length || summary.excellentStudents || 0;
}

function ComparisonMetric({
  title,
  firstValue,
  secondValue,
  difference,
}: {
  title: string;
  firstValue: string | number;
  secondValue: string | number;
  difference: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-black text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-center">
          <p className="text-[11px] font-black text-slate-400">الأول</p>
          <p className="mt-1 text-lg font-black text-slate-950">{firstValue}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-center">
          <p className="text-[11px] font-black text-slate-400">الثاني</p>
          <p className="mt-1 text-lg font-black text-slate-950">{secondValue}</p>
        </div>
        <div className="rounded-2xl bg-cyan-50 p-3 text-center">
          <p className="text-[11px] font-black text-cyan-600">الفرق</p>
          <p className="mt-1 text-lg font-black text-cyan-700">{difference}</p>
        </div>
      </div>
    </article>
  );
}

function StudentDeltaList({
  title,
  students,
  positive,
}: {
  title: string;
  students: Array<AssessmentStudentPerformanceSummary & { delta: number }>;
  positive?: boolean;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {positive ? (
          <TrendingUp className="h-5 w-5 text-emerald-600" />
        ) : (
          <TrendingDown className="h-5 w-5 text-rose-600" />
        )}
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>

      <div className="mt-4 space-y-2">
        {students.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">
            لا توجد بيانات كافية.
          </p>
        ) : (
          students.slice(0, 5).map((student) => (
            <div
              key={`${student.studentName}-${student.nationalId || ""}-${student.grade || ""}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">
                  {student.studentName}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {student.grade || "غير محدد"} / {student.classroom || "غير محدد"}
                </p>
              </div>

              <span
                className={[
                  "shrink-0 text-sm font-black",
                  positive ? "text-emerald-700" : "text-rose-700",
                ].join(" ")}
              >
                {student.delta > 0 ? "+" : ""}
                {student.delta}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export function AssessmentAnalysisComparison({
  analyses,
  initialFirstId,
  initialSecondId,
}: Props) {
  const defaultFirst = initialFirstId || analyses[0]?.id || "";
  const defaultSecond =
    initialSecondId || analyses.find((item) => item.id !== defaultFirst)?.id || "";

  const [firstId, setFirstId] = useState(defaultFirst);
  const [secondId, setSecondId] = useState(defaultSecond);

  const preparedAnalyses = useMemo(
    () =>
      analyses.map((analysis) => {
        const rows = asRows(analysis.rowsJson);
        const summary = mergeSummary(asSummary(analysis.summaryJson), rows);
        const students = buildStudentPerformanceSummaries(rows);

        return {
          ...analysis,
          rows,
          summary,
          students,
        };
      }),
    [analyses],
  );

  const first = preparedAnalyses.find((analysis) => analysis.id === firstId) || null;
  const second = preparedAnalyses.find((analysis) => analysis.id === secondId) || null;

  const subjectComparison = useMemo(() => {
    if (!first || !second) {
      return { improved: [] as string[], declined: [] as string[] };
    }

    const firstMap = new Map(
      (first.summary.subjectAverages || []).map((item) => [item.subject, item.averagePercentage]),
    );
    const secondMap = new Map(
      (second.summary.subjectAverages || []).map((item) => [item.subject, item.averagePercentage]),
    );

    const subjects = Array.from(new Set([...firstMap.keys(), ...secondMap.keys()]));

    const improved = subjects
      .map((subject) => ({
        subject,
        delta: (secondMap.get(subject) || 0) - (firstMap.get(subject) || 0),
      }))
      .filter((item) => item.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5)
      .map((item) => `${item.subject} (+${item.delta})`);

    const declined = subjects
      .map((subject) => ({
        subject,
        delta: (secondMap.get(subject) || 0) - (firstMap.get(subject) || 0),
      }))
      .filter((item) => item.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 5)
      .map((item) => `${item.subject} (${item.delta})`);

    return { improved, declined };
  }, [first, second]);

  const studentComparison = useMemo(() => {
    if (!first || !second) {
      return {
        improved: [] as Array<AssessmentStudentPerformanceSummary & { delta: number }>,
        declined: [] as Array<AssessmentStudentPerformanceSummary & { delta: number }>,
      };
    }

    const firstMap = new Map(
      first.students.map((student) => [getAssessmentStudentKey(student), student]),
    );
    const secondMap = new Map(
      second.students.map((student) => [getAssessmentStudentKey(student), student]),
    );

    const deltas = Array.from(secondMap.entries())
      .map(([key, student]) => {
        const oldStudent = firstMap.get(key);
        if (!oldStudent) return null;

        return {
          ...student,
          delta: student.averagePercentage - oldStudent.averagePercentage,
        };
      })
      .filter((item) => item !== null) as StudentDelta[];

    return {
      improved: [...deltas]
        .filter((item) => item.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 5),
      declined: [...deltas]
        .filter((item) => item.delta < 0)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 5),
    };
  }, [first, second]);

  const recommendationLines = useMemo(() => {
    if (!first || !second) return [];

    const weakFirst = getWeakCount(first.summary);
    const weakSecond = getWeakCount(second.summary);
    const improvedCount = subjectComparison.improved.length;
    const declinedCount = subjectComparison.declined.length;

    return [
      `النتائج ${second.summary.averagePercentage >= first.summary.averagePercentage ? "تحسنت" : "انخفضت"} من ${first.summary.averagePercentage}% إلى ${second.summary.averagePercentage}%.`,
      `عدد الطلاب الضعاف ${weakSecond <= weakFirst ? "انخفض" : "ارتفع"} من ${weakFirst} إلى ${weakSecond}.`,
      `تحسنت ${improvedCount} مواد وانخفضت ${declinedCount} مواد.`,
    ];
  }, [first, second, subjectComparison]);

  return (
    <section className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              التحليل الأول
            </label>
            <select
              value={firstId}
              onChange={(event) => setFirstId(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
            >
              {preparedAnalyses.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {analysis.title} - {new Date(analysis.createdAt).toLocaleDateString("ar-SA")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              التحليل الثاني
            </label>
            <select
              value={secondId}
              onChange={(event) => setSecondId(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
            >
              {preparedAnalyses.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {analysis.title} - {new Date(analysis.createdAt).toLocaleDateString("ar-SA")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!first || !second ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-black text-slate-500">
            اختر تحليلين لعرض المقارنة.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <ComparisonMetric
              title="المتوسط"
              firstValue={`${first.summary.averagePercentage}%`}
              secondValue={`${second.summary.averagePercentage}%`}
              difference={`${
                second.summary.averagePercentage - first.summary.averagePercentage > 0 ? "+" : ""
              }${second.summary.averagePercentage - first.summary.averagePercentage}%`}
            />
            <ComparisonMetric
              title="الطلاب الضعاف"
              firstValue={getWeakCount(first.summary)}
              secondValue={getWeakCount(second.summary)}
              difference={`${
                getWeakCount(second.summary) - getWeakCount(first.summary) > 0 ? "+" : ""
              }${getWeakCount(second.summary) - getWeakCount(first.summary)}`}
            />
            <ComparisonMetric
              title="الطلاب المتفوقون"
              firstValue={getExcellentCount(first.summary)}
              secondValue={getExcellentCount(second.summary)}
              difference={`${
                getExcellentCount(second.summary) - getExcellentCount(first.summary) > 0 ? "+" : ""
              }${getExcellentCount(second.summary) - getExcellentCount(first.summary)}`}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-cyan-600" />
                <h3 className="text-base font-black text-slate-950">المواد</h3>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-black text-emerald-700">مواد تحسنت</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {subjectComparison.improved.length === 0 ? (
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-500">
                        لا توجد
                      </span>
                    ) : (
                      subjectComparison.improved.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700"
                        >
                          {item}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black text-rose-700">مواد انخفضت</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {subjectComparison.declined.length === 0 ? (
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-500">
                        لا توجد
                      </span>
                    ) : (
                      subjectComparison.declined.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-rose-50 px-3 py-2 text-sm font-black text-rose-700"
                        >
                          {item}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="h-5 w-5 text-cyan-600" />
                <h3 className="text-base font-black text-slate-950">توصية مختصرة</h3>
              </div>

              <div className="mt-4 space-y-2">
                {recommendationLines.map((line) => (
                  <p
                    key={line}
                    className="rounded-2xl bg-slate-50 p-3 text-sm font-bold leading-7 text-slate-700"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <StudentDeltaList
              title="أكثر الطلاب تحسنًا"
              students={studentComparison.improved}
              positive
            />
            <StudentDeltaList
              title="أكثر الطلاب انخفاضًا"
              students={studentComparison.declined}
            />
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-cyan-600" />
              <h3 className="text-base font-black text-slate-950">
                ملخص التقديرات
              </h3>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {(second.summary.gradeBandSummary || []).map((item) => (
                <div
                  key={item.band}
                  className="rounded-2xl bg-slate-50 p-4 text-center"
                >
                  <p className="text-sm font-black text-slate-900">
                    {getGradeBandLabel(item.band)}
                  </p>
                  <p className="mt-2 text-2xl font-black text-cyan-700">
                    {item.count}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {item.percentage}%
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
