"use client";

import { useMemo, useState } from "react";

type StudentRow = {
  studentName: string;
  subject: string;
  score: number;
  maxScore: number;
  grade?: string | null;
  classroom?: string | null;
  semester?: string | null;
  sourceFile?: string | null;
};

type StudentAverage = {
  studentName: string;
  average: number;
};

type SubjectAverage = {
  subject: string;
  average: number;
};

type Summary = {
  totalStudents: number;
  totalSubjects: number;
  averageScore: number;
  studentAverages: StudentAverage[];
  top5: StudentAverage[];
  top10: StudentAverage[];
  weakStudents: StudentAverage[];
  subjectAverages: SubjectAverage[];
  distribution: Record<string, number>;
  insights: string[];
};

type Props = {
  analysis: {
    id: string;
    title: string;
    grade: string | null;
    classroom: string | null;
    sourceFile: string | null;
    totalStudents: number;
    totalSubjects: number;
    averageScore: number | null;
    summaryJson: unknown;
    rowsJson: unknown;
    createdAt: Date;
  };
};

export function ResultsAnalysisDashboard({ analysis }: Props) {
  const rows = (
    Array.isArray(analysis.rowsJson) ? analysis.rowsJson : []
  ) as StudentRow[];

  const [subject, setSubject] = useState("ALL");
  const [grade, setGrade] = useState("ALL");
  const [classroom, setClassroom] = useState("ALL");
  const [semester, setSemester] = useState("ALL");
  const [level, setLevel] = useState("ALL");

  const subjects = unique(rows.map((row) => row.subject));
  const grades = unique(
    rows.map((row) => row.grade).filter(Boolean) as string[]
  );
  const classrooms = unique(
    rows.map((row) => row.classroom).filter(Boolean) as string[]
  );
  const semesters = unique(
    rows.map((row) => row.semester).filter(Boolean) as string[]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (subject !== "ALL" && row.subject !== subject) return false;
      if (grade !== "ALL" && row.grade !== grade) return false;
      if (classroom !== "ALL" && row.classroom !== classroom) return false;
      if (semester !== "ALL" && row.semester !== semester) return false;

      return true;
    });
  }, [rows, subject, grade, classroom, semester]);

  const summary = useMemo(() => analyzeRows(filteredRows), [filteredRows]);

  const visibleStudents = useMemo(() => {
    if (level === "TOP5") return summary.top5;
    if (level === "TOP10") return summary.top10;
    if (level === "WEAK") return summary.weakStudents;

    return summary.studentAverages;
  }, [summary, level]);

  const classroomCompare = useMemo(
    () => compareClassrooms(filteredRows),
    [filteredRows]
  );

  const heatmap = useMemo(() => buildHeatmap(filteredRows), [filteredRows]);

  const parentReports = useMemo(
    () => buildParentReports(summary.weakStudents),
    [summary.weakStudents]
  );

  const riskStudents = useMemo(
    () => buildPredictiveRisk(summary.studentAverages),
    [summary.studentAverages]
  );

  return (
    <main className="space-y-8 print:bg-white">
      <section className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-500 p-10 text-white shadow-2xl print:bg-white print:text-slate-900 print:shadow-none">
        <p className="text-sm font-bold text-blue-100 print:text-slate-500">
          Results Analysis Report
        </p>

        <h1 className="mt-4 text-5xl font-black">{analysis.title}</h1>

        <div className="mt-5 grid gap-3 text-sm text-blue-50 md:grid-cols-3 print:text-slate-600">
          <p>الملف: {analysis.sourceFile || "غير محدد"}</p>
          <p>الصف: {analysis.grade || "الكل"}</p>
          <p>الشعبة: {analysis.classroom || "الكل"}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 hover:bg-blue-50"
          >
            Export PDF
          </button>

          <a
            href="/dashboard/results-analysis/compare"
            className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/20"
          >
            مقارنة تحليلين
          </a>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:hidden">
        <h2 className="text-2xl font-black text-slate-900">فلاتر التحليل</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <FilterSelect
            label="المادة"
            value={subject}
            onChange={setSubject}
            options={subjects}
          />

          <FilterSelect
            label="الصف"
            value={grade}
            onChange={setGrade}
            options={grades}
          />

          <FilterSelect
            label="الفصل/الشعبة"
            value={classroom}
            onChange={setClassroom}
            options={classrooms}
          />

          <FilterSelect
            label="الترم الدراسي"
            value={semester}
            onChange={setSemester}
            options={semesters}
          />

          <div>
            <label className="text-sm font-bold text-slate-600">
              نوع التحليل
            </label>

            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-400"
            >
              <option value="ALL">جميع الطلاب</option>
              <option value="TOP5">الخمس الأوائل</option>
              <option value="TOP10">العشرة الأوائل</option>
              <option value="WEAK">الطلاب الضعفاء</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <KpiCard title="عدد الطلاب" value={summary.totalStudents} />
        <KpiCard title="عدد المواد" value={summary.totalSubjects} />
        <KpiCard title="المتوسط العام" value={`${summary.averageScore}%`} />
        <KpiCard title="مؤشر الخطورة" value={riskStudents.length} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SubjectAverageLines items={summary.subjectAverages} />
        <ClassroomCompareLines items={classroomCompare} />
        <DistributionLines distribution={summary.distribution} />
        <SubjectDeepAnalysisCard items={summary.subjectAverages} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <StudentsCard title="نتائج الطلاب حسب الفلتر" items={visibleStudents} />
        <HeatmapCard rows={heatmap} />
        <InsightsCard summary={summary} riskStudents={riskStudents} />
        <ParentReportsCard reports={parentReports} />
      </section>
    </main>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function percentage(row: StudentRow) {
  const max = Number(row.maxScore || 100);

  if (!max) return 0;

  return (Number(row.score || 0) / max) * 100;
}

function average(values: number[]) {
  if (!values.length) return 0;

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)
  );
}

function analyzeRows(rows: StudentRow[]): Summary {
  const totalStudents = new Set(rows.map((row) => row.studentName)).size;
  const totalSubjects = new Set(rows.map((row) => row.subject)).size;
  const averageScore = average(rows.map(percentage));

  const studentMap = new Map<string, number[]>();
  const subjectMap = new Map<string, number[]>();

  for (const row of rows) {
    studentMap.set(row.studentName, [
      ...(studentMap.get(row.studentName) ?? []),
      percentage(row),
    ]);

    subjectMap.set(row.subject, [
      ...(subjectMap.get(row.subject) ?? []),
      percentage(row),
    ]);
  }

  const studentAverages = Array.from(studentMap.entries())
    .map(([studentName, values]) => ({
      studentName,
      average: average(values),
    }))
    .sort((a, b) => b.average - a.average);

  const subjectAverages = Array.from(subjectMap.entries())
    .map(([subject, values]) => ({
      subject,
      average: average(values),
    }))
    .sort((a, b) => a.average - b.average);

  const weakStudents = studentAverages.filter((item) => item.average < 60);

  const distribution = {
    ممتاز: studentAverages.filter((student) => student.average >= 90).length,
    "جيد جدًا": studentAverages.filter(
      (student) => student.average >= 80 && student.average < 90
    ).length,
    جيد: studentAverages.filter(
      (student) => student.average >= 70 && student.average < 80
    ).length,
    مقبول: studentAverages.filter(
      (student) => student.average >= 60 && student.average < 70
    ).length,
    ضعيف: weakStudents.length,
  };

  const hardestSubject = subjectAverages[0];

  const strongestSubject = [...subjectAverages].sort(
    (a, b) => b.average - a.average
  )[0];

  const insights = [
    `المتوسط العام حسب الفلتر الحالي هو ${averageScore}%.`,
    hardestSubject
      ? `أقل مادة في المتوسط هي ${hardestSubject.subject} بمتوسط ${hardestSubject.average}%.`
      : "",
    strongestSubject
      ? `أعلى مادة في المتوسط هي ${strongestSubject.subject} بمتوسط ${strongestSubject.average}%.`
      : "",
    `عدد الطلاب الضعفاء حسب الفلتر الحالي: ${weakStudents.length}.`,
  ].filter(Boolean);

  return {
    totalStudents,
    totalSubjects,
    averageScore,
    studentAverages,
    top5: studentAverages.slice(0, 5),
    top10: studentAverages.slice(0, 10),
    weakStudents,
    subjectAverages,
    distribution,
    insights,
  };
}

function compareClassrooms(rows: StudentRow[]) {
  const map = new Map<string, number[]>();

  for (const row of rows) {
    const key = row.classroom || "غير محدد";

    map.set(key, [...(map.get(key) ?? []), percentage(row)]);
  }

  return Array.from(map.entries()).map(([classroom, values]) => ({
    classroom,
    average: average(values),
  }));
}

function buildHeatmap(rows: StudentRow[]) {
  const students = unique(rows.map((row) => row.studentName)).slice(0, 20);
  const subjects = unique(rows.map((row) => row.subject)).slice(0, 8);

  return students.map((student) => ({
    student,
    subjects: subjects.map((subject) => {
      const matches = rows.filter(
        (row) => row.studentName === student && row.subject === subject
      );

      return {
        subject,
        value: average(matches.map(percentage)),
      };
    }),
  }));
}

function buildParentReports(students: StudentAverage[]) {
  return students.slice(0, 10).map((student) => ({
    studentName: student.studentName,
    message: `يحتاج الطالب/الطالبة ${student.studentName} إلى متابعة أكاديمية، حيث بلغ المتوسط ${student.average}%. يوصى بالتواصل مع ولي الأمر ووضع خطة علاجية قصيرة.`,
  }));
}

function buildPredictiveRisk(students: StudentAverage[]) {
  return students.filter((student) => student.average < 65);
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-400"
      >
        <option value="ALL">الكل</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>

      <p className="mt-4 text-4xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function StudentsCard({
  title,
  items,
}: {
  title: string;
  items: StudentAverage[];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>

      <div className="mt-5 max-h-[460px] space-y-3 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            لا توجد بيانات حسب الفلتر الحالي.
          </p>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.studentName}-${index}`}
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
            >
              <span className="font-bold text-slate-900">
                {index + 1}. {item.studentName}
              </span>

              <span className="font-black text-blue-600">{item.average}%</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SubjectAverageLines({ items }: { items: SubjectAverage[] }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">متوسطات المواد</h2>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد بيانات.</p>
        ) : (
          items.map((item) => (
            <ProgressLine
              key={item.subject}
              label={item.subject}
              value={item.average}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ClassroomCompareLines({
  items,
}: {
  items: Array<{ classroom: string; average: number }>;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">مقارنة الشعب</h2>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد بيانات.</p>
        ) : (
          items.map((item) => (
            <ProgressLine
              key={item.classroom}
              label={item.classroom}
              value={item.average}
            />
          ))
        )}
      </div>
    </section>
  );
}

function DistributionLines({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const total = Object.values(distribution).reduce(
    (sum, value) => sum + value,
    0
  );

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">توزيع التقديرات</h2>

      <div className="mt-5 space-y-4">
        {Object.entries(distribution).map(([label, value]) => {
          const percent = total
            ? Number(((value / total) * 100).toFixed(1))
            : 0;

          return (
            <ProgressLine
              key={label}
              label={`${label} (${value})`}
              value={percent}
            />
          );
        })}
      </div>
    </section>
  );
}

function SubjectDeepAnalysisCard({ items }: { items: SubjectAverage[] }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">
        التحليل التفصيلي للمواد
      </h2>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد بيانات.</p>
        ) : (
          items.map((item) => (
            <div key={item.subject} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {item.subject}
                </span>

                <span className="font-black text-blue-600">
                  {item.average}%
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {item.average < 60
                  ? "تحتاج خطة علاجية عاجلة."
                  : item.average < 75
                    ? "تحتاج تحسين ومتابعة."
                    : "مستوى جيد."}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ProgressLine({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(Number(value || 0), 100));

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-slate-900">{label}</span>

        <span className="font-black text-blue-600">{safeValue}%</span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-blue-600"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function HeatmapCard({
  rows,
}: {
  rows: Array<{
    student: string;
    subjects: Array<{ subject: string; value: number }>;
  }>;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">Heatmap الأداء</h2>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-slate-500">لا توجد بيانات.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.student} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2 font-bold text-slate-700">
                    {row.student}
                  </td>

                  {row.subjects.map((cell) => (
                    <td key={cell.subject} className="px-2 py-2">
                      <div
                        title={cell.subject}
                        className="rounded-lg px-3 py-2 text-center text-xs font-black"
                        style={{
                          backgroundColor:
                            cell.value >= 85
                              ? "#dcfce7"
                              : cell.value >= 70
                                ? "#fef9c3"
                                : "#fee2e2",
                          color:
                            cell.value >= 85
                              ? "#166534"
                              : cell.value >= 70
                                ? "#854d0e"
                                : "#991b1b",
                        }}
                      >
                        {cell.value || "-"}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InsightsCard({
  summary,
  riskStudents,
}: {
  summary: Summary;
  riskStudents: StudentAverage[];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">
        AI Recommendations
      </h2>

      <div className="mt-5 space-y-4 text-sm leading-8 text-slate-600">
        {summary.insights.map((item, index) => (
          <p key={index} className="rounded-2xl bg-blue-50 p-4 text-blue-900">
            {item}
          </p>
        ))}

        {riskStudents.length > 0 ? (
          <p className="rounded-2xl bg-red-50 p-4 text-red-700">
            يوجد {riskStudents.length} طالب/طالبة ضمن مؤشر الخطورة الأكاديمية.
            يوصى بخطة تدخل مبكر.
          </p>
        ) : (
          <p className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
            لا توجد مؤشرات خطورة واضحة حسب الفلتر الحالي.
          </p>
        )}
      </div>
    </section>
  );
}

function ParentReportsCard({
  reports,
}: {
  reports: Array<{ studentName: string; message: string }>;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">Parent Reports</h2>

      <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto">
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">
            لا توجد تقارير أولياء أمور مطلوبة.
          </p>
        ) : (
          reports.map((report) => (
            <div key={report.studentName} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">
                {report.studentName}
              </h3>

              <p className="mt-2 text-sm leading-7 text-slate-600">
                {report.message}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}