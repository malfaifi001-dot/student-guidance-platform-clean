"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  buildAssessmentAnalysisSummary,
  getGradeBand,
  getGradeBandLabel,
} from "@/lib/assessment-center/assessment-analysis-summary";
import type {
  AssessmentAnalysisSummary,
  AssessmentResultRow,
  AssessmentStudentPerformanceSummary,
  AssessmentSubjectGradeDistribution,
  AssessmentSubjectSummary,
} from "@/lib/assessment-center/assessment-center-types";

type Props = {
  rows: AssessmentResultRow[];
  summary: AssessmentAnalysisSummary | null;
};

type TabKey = "overview" | "students" | "subjects";

type SummaryListCardProps = {
  title: string;
  subtitle: string;
  items: AssessmentStudentPerformanceSummary[];
  tone: string;
};

type OverviewSubjectCardProps = {
  title: string;
  items: AssessmentSubjectSummary[];
};

function mergeSummary(
  summary: AssessmentAnalysisSummary | null,
  fallback: AssessmentAnalysisSummary,
) {
  if (!summary) return fallback;

  return {
    ...fallback,
    ...summary,
    topFiveStudents:
      summary.topFiveStudents && summary.topFiveStudents.length
        ? summary.topFiveStudents
        : fallback.topFiveStudents,
    topTenStudents:
      summary.topTenStudents && summary.topTenStudents.length
        ? summary.topTenStudents
        : fallback.topTenStudents,
    excellentStudentsList:
      summary.excellentStudentsList && summary.excellentStudentsList.length
        ? summary.excellentStudentsList
        : fallback.excellentStudentsList,
    veryGoodStudents:
      summary.veryGoodStudents && summary.veryGoodStudents.length
        ? summary.veryGoodStudents
        : fallback.veryGoodStudents,
    goodStudents:
      summary.goodStudents && summary.goodStudents.length
        ? summary.goodStudents
        : fallback.goodStudents,
    acceptableStudents:
      summary.acceptableStudents && summary.acceptableStudents.length
        ? summary.acceptableStudents
        : fallback.acceptableStudents,
    weakStudents:
      summary.weakStudents && summary.weakStudents.length
        ? summary.weakStudents
        : fallback.weakStudents,
    multiSubjectWeakStudents:
      summary.multiSubjectWeakStudents && summary.multiSubjectWeakStudents.length
        ? summary.multiSubjectWeakStudents
        : fallback.multiSubjectWeakStudents,
    gradeBandSummary:
      summary.gradeBandSummary && summary.gradeBandSummary.length
        ? summary.gradeBandSummary
        : fallback.gradeBandSummary,
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

function getStudentStatusLabel(row: AssessmentResultRow) {
  const band = getGradeBand(row.percentage);

  if (row.status === "RISK" || row.status === "NEEDS_SUPPORT" || band === "WEAK") {
    return "يحتاج متابعة";
  }

  if (band === "ACCEPTABLE") return "مقبول";
  if (band === "EXCELLENT" || band === "VERY_GOOD") return "متفوق";
  if (band === "GOOD") return "جيد";
  return "غير محدد";
}

function SummaryListCard({
  title,
  subtitle,
  items,
  tone,
}: SummaryListCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items.slice(0, 10) : items.slice(0, 5);

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">{subtitle}</p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>
          {items.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {visibleItems.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">
            لا توجد بيانات
          </p>
        ) : (
          visibleItems.map((student) => (
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

              <span className="shrink-0 text-sm font-black text-cyan-700">
                {student.averagePercentage}%
              </span>
            </div>
          ))
        )}
      </div>

      {items.length > 5 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-4 text-sm font-black text-cyan-700"
        >
          {expanded ? "عرض أقل" : "عرض المزيد"}
        </button>
      ) : null}
    </article>
  );
}

function OverviewSubjectCard({ title, items }: OverviewSubjectCardProps) {
  if (!items.length) return null;

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-black text-slate-950">{title}</h3>

      <div className="mt-4 space-y-3">
        {items.slice(0, 5).map((subject) => (
          <div key={subject.subject} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-slate-900">{subject.subject}</span>
              <span className="text-sm font-black text-cyan-700">
                {subject.averagePercentage}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-cyan-600"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(subject.averagePercentage, 100),
                  )}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function GradeDistributionCard({
  items,
}: {
  items: NonNullable<AssessmentAnalysisSummary["gradeBandSummary"]>;
}) {
  const visibleItems = items.filter((item) => item.count > 0);

  if (!visibleItems.length) return null;

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-black text-slate-950">توزيع التقديرات</h3>

      <div className="mt-4 space-y-3">
        {visibleItems.map((item) => (
          <div key={item.band} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-slate-900">{item.label}</span>
              <span className="text-sm font-black text-cyan-700">
                {item.count} • {item.percentage}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-cyan-600"
                style={{
                  width: `${Math.max(0, Math.min(item.percentage, 100))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function AssessmentAnalysisReadingPanel({ rows, summary }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [classroomFilter, setClassroomFilter] = useState("");
  const [bandFilter, setBandFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fallbackSummary = useMemo(
    () => buildAssessmentAnalysisSummary(rows),
    [rows],
  );
  const safeSummary = useMemo(
    () => mergeSummary(summary, fallbackSummary),
    [summary, fallbackSummary],
  );
  const weakestSubjects = useMemo(
    () => (safeSummary.weakestSubjects || safeSummary.subjectAverages || []).slice(0, 5),
    [safeSummary],
  );
  const followUpStudents = useMemo(
    () => safeSummary.weakStudents || [],
    [safeSummary],
  );
  const hasGradeDistribution = useMemo(
    () => (safeSummary.gradeBandSummary || []).some((item) => item.count > 0),
    [safeSummary],
  );

  const subjects = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => String(row.subject || "").trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "ar"),
      ),
    [rows],
  );

  const grades = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => String(row.grade || "").trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "ar"),
      ),
    [rows],
  );

  const classrooms = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => String(row.classroom || "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "ar")),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const band = getGradeBand(row.percentage);
      const statusLabel = getStudentStatusLabel(row);
      const searchable = [
        row.studentName,
        row.nationalId || "",
        row.grade || "",
        row.classroom || "",
        row.subject || "",
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedSearch && !searchable.includes(normalizedSearch)) return false;
      if (subjectFilter && row.subject !== subjectFilter) return false;
      if (gradeFilter && row.grade !== gradeFilter) return false;
      if (classroomFilter && row.classroom !== classroomFilter) return false;
      if (bandFilter && band !== bandFilter) return false;

      if (statusFilter === "HIGH" && statusLabel !== "متفوق") return false;
      if (statusFilter === "ACCEPTABLE" && band !== "ACCEPTABLE") return false;
      if (statusFilter === "WEAK" && band !== "WEAK") return false;
      if (statusFilter === "FOLLOW" && statusLabel !== "يحتاج متابعة") return false;

      return true;
    });
  }, [rows, search, subjectFilter, gradeFilter, classroomFilter, bandFilter, statusFilter]);

  const subjectDistribution = (safeSummary.subjectGradeDistribution || []) as AssessmentSubjectGradeDistribution[];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">فهم النتائج بسهولة</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-black transition",
              activeTab === "overview"
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            نظرة عامة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-black transition",
              activeTab === "students"
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            الطلاب
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("subjects")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-black transition",
              activeTab === "subjects"
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            المواد
          </button>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <OverviewSubjectCard title="أضعف المواد" items={weakestSubjects} />
          <SummaryListCard
            title="الخمسة الأوائل"
            subtitle="أعلى متوسطات الطلاب"
            items={safeSummary.topFiveStudents || []}
            tone="bg-emerald-50 text-emerald-700"
          />
          {followUpStudents.length ? (
            <SummaryListCard
              title="الطلاب المحتاجون متابعة"
              subtitle="أقرب الحالات التي تحتاج متابعة"
              items={followUpStudents}
              tone="bg-rose-50 text-rose-700"
            />
          ) : null}
          {hasGradeDistribution ? (
            <GradeDistributionCard items={safeSummary.gradeBandSummary || []} />
          ) : null}
        </div>
      ) : null}

      {activeTab === "students" ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 lg:grid-cols-6">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 lg:col-span-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم الطالب أو الهوية"
                className="h-12 flex-1 bg-transparent text-sm font-bold outline-none"
              />
            </div>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
            >
              <option value="">كل المواد</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
            >
              <option value="">كل الصفوف</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>

            <select
              value={classroomFilter}
              onChange={(event) => setClassroomFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
            >
              <option value="">كل الفصول</option>
              {classrooms.map((classroom) => (
                <option key={classroom} value={classroom}>
                  {classroom}
                </option>
              ))}
            </select>

            <select
              value={bandFilter}
              onChange={(event) => setBandFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
            >
              <option value="">كل التقديرات</option>
              <option value="EXCELLENT">ممتاز</option>
              <option value="VERY_GOOD">جيد جدًا</option>
              <option value="GOOD">جيد</option>
              <option value="ACCEPTABLE">مقبول</option>
              <option value="WEAK">ضعيف</option>
            </select>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
            >
              <option value="ALL">الحالة: الكل</option>
              <option value="HIGH">متفوق</option>
              <option value="ACCEPTABLE">مقبول</option>
              <option value="WEAK">ضعيف</option>
              <option value="FOLLOW">يحتاج متابعة</option>
            </select>
          </div>

          <div className="grid gap-3">
            {filteredRows.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                لا توجد نتائج مطابقة للفلاتر.
              </div>
            ) : (
              filteredRows.slice(0, 80).map((row) => {
                const band = getGradeBand(row.percentage);
                const statusLabel = getStudentStatusLabel(row);

                return (
                  <article
                    key={row.id}
                    className="rounded-[1.4rem] border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-black text-slate-950">
                            {row.studentName}
                          </h3>
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                            {row.subject}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-500">
                          {row.grade || "غير محدد"} / {row.classroom || "غير محدد"}
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[420px]">
                        <div className="rounded-2xl bg-white px-3 py-2 text-center">
                          <p className="text-[11px] font-black text-slate-400">النسبة</p>
                          <p className="mt-1 text-sm font-black text-cyan-700">
                            {row.percentage ?? 0}%
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-center">
                          <p className="text-[11px] font-black text-slate-400">التقدير</p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {getGradeBandLabel(band)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-center">
                          <p className="text-[11px] font-black text-slate-400">الحالة</p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {statusLabel}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-center">
                          <p className="text-[11px] font-black text-slate-400">الهوية</p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {row.nationalId || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "subjects" ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-rose-600" />
                <h3 className="text-lg font-black text-slate-950">أضعف المواد</h3>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(safeSummary.weakestSubjects || []).slice(0, 5).map((item) => (
                  <span
                    key={item.subject}
                    className="rounded-full bg-rose-50 px-3 py-2 text-sm font-black text-rose-700"
                  >
                    {item.subject} - {item.averagePercentage}%
                  </span>
                ))}
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-950">أقوى المواد</h3>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(safeSummary.strongestSubjects || []).slice(0, 5).map((item) => (
                  <span
                    key={item.subject}
                    className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700"
                  >
                    {item.subject} - {item.averagePercentage}%
                  </span>
                ))}
              </div>
            </article>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-cyan-600" />
              <h3 className="text-lg font-black text-slate-950">
                توزيع التقديرات لكل مادة
              </h3>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[920px] text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="py-3 font-black">المادة</th>
                    <th className="py-3 font-black">ممتاز</th>
                    <th className="py-3 font-black">جيد جدًا</th>
                    <th className="py-3 font-black">جيد</th>
                    <th className="py-3 font-black">مقبول</th>
                    <th className="py-3 font-black">ضعيف</th>
                    <th className="py-3 font-black">المتوسط</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectDistribution.map((item) => (
                    <tr key={item.subject} className="border-b border-slate-50">
                      <td className="py-3 font-black text-slate-900">
                        {item.subject}
                      </td>
                      <td className="py-3 font-bold text-slate-600">
                        {item.bands.EXCELLENT}
                      </td>
                      <td className="py-3 font-bold text-slate-600">
                        {item.bands.VERY_GOOD}
                      </td>
                      <td className="py-3 font-bold text-slate-600">
                        {item.bands.GOOD}
                      </td>
                      <td className="py-3 font-bold text-slate-600">
                        {item.bands.ACCEPTABLE}
                      </td>
                      <td className="py-3 font-bold text-slate-600">
                        {item.bands.WEAK}
                      </td>
                      <td className="py-3">
                        <div className="min-w-[140px]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-black text-cyan-700">
                              {item.averagePercentage}%
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-cyan-600"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(item.averagePercentage, 100),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
