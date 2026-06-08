import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  FileSpreadsheet,
  Lightbulb,
  ListChecks,
  UsersRound,
} from "lucide-react";
import type {
  AssessmentAnalysisSummary,
  AssessmentResultRow,
} from "@/lib/assessment-center/assessment-center-types";
import { buildAssessmentSmartNarrative } from "@/lib/assessment-center/assessment-center-insights";

type Props = {
  analysis: {
    id: string;
    title: string;
    sourceFile?: string | null;
    totalStudents: number;
    totalRows: number;
    totalSubjects: number;
    averagePercentage?: number | null;
    createdAt: Date;
    summaryJson?: unknown;
    rowsJson?: unknown;
  };
};

function asSummary(value: unknown): AssessmentAnalysisSummary | null {
  if (!value || typeof value !== "object") return null;

  return value as AssessmentAnalysisSummary;
}

function asRows(value: unknown): AssessmentResultRow[] {
  if (!Array.isArray(value)) return [];

  return value as AssessmentResultRow[];
}

function getStatusLabel(status?: string | null) {
  if (status === "EXCELLENT") return "متفوق";
  if (status === "GOOD") return "جيد";
  if (status === "NEEDS_SUPPORT") return "يحتاج دعم";
  if (status === "RISK") return "خطر";
  return "غير محدد";
}

export function AssessmentAnalysisDetail({ analysis }: Props) {
  const summary = asSummary(analysis.summaryJson);
  const rows = asRows(analysis.rowsJson).slice(0, 30);
  const smartNarrative = buildAssessmentSmartNarrative(summary);

  const kpis = [
    {
      label: "الطلاب",
      value: analysis.totalStudents,
      note: "طلاب تمت قراءتهم",
      icon: UsersRound,
    },
    {
      label: "المواد",
      value: analysis.totalSubjects,
      note: "مواد داخل الملف",
      icon: FileSpreadsheet,
    },
    {
      label: "متوسط التحليل",
      value: `${Math.round(Number(analysis.averagePercentage || 0))}%`,
      note: "متوسط عام",
      icon: BarChart3,
    },
    {
      label: "يحتاجون متابعة",
      value: summary?.riskStudentsCount || 0,
      note: "طلاب منخفضو الأداء",
      icon: Lightbulb,
    },
  ];

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
        <Link
          href="/dashboard/assessment-center"
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black text-cyan-50"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للمركز
        </Link>

        <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
          {analysis.title}
        </h1>

        <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
          مصدر الملف: {analysis.sourceFile || "غير محدد"} — تاريخ التحليل:
          {" "}
          {analysis.createdAt.toLocaleDateString("ar-SA")}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/api/dashboard/assessment-center/${analysis.id}/export?format=excel`}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
          >
            تصدير Excel
          </a>

          <a
            href={`/api/dashboard/assessment-center/${analysis.id}/export?format=pdf`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            تصدير PDF
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-4xl font-black text-slate-950">
                    {item.value}
                  </p>
                </div>

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              <p className="mt-4 text-sm font-bold leading-7 text-slate-500">
                {item.note}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
              <BrainCircuit className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black text-cyan-600">الملخص الذكي</p>
              <h2 className="text-2xl font-black text-slate-950">
                قراءة تحليلية سريعة
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {smartNarrative.insights.map((item, index) => (
              <p
                key={`insight-${index}`}
                className="rounded-2xl bg-cyan-50 p-4 text-sm font-bold leading-8 text-cyan-900"
              >
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Lightbulb className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black text-emerald-600">
                التوصيات العلاجية
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                إجراءات مقترحة
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {smartNarrative.recommendations.map((item, index) => (
              <p
                key={`recommendation-${index}`}
                className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-8 text-emerald-900"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <ListChecks className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-black text-amber-600">
              تدخلات مقترحة مستقبلًا
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              تمهيد لقواعد التدخل الذكي
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {smartNarrative.interventions.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-8 text-slate-500 md:col-span-2">
              لا توجد تدخلات حرجة واضحة في هذا التحليل. ستفعل هذه المنطقة
              لاحقًا عند ربط Assessment Center بمحرك الـ Workflow.
            </p>
          ) : (
            smartNarrative.interventions.map((item, index) => (
              <article
                key={`intervention-${index}`}
                className="rounded-[1.4rem] border border-amber-100 bg-amber-50 p-5"
              >
                <h3 className="text-base font-black text-slate-950">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm font-bold leading-7 text-amber-900">
                  {item.description}
                </p>

                <p className="mt-3 rounded-2xl bg-white/70 p-3 text-xs font-black leading-6 text-amber-700">
                  لاحقًا: {item.futureAction}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-cyan-600">أضعف المواد</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            متوسط المواد
          </h2>

          <div className="mt-5 space-y-3">
            {(summary?.subjectAverages || []).slice(0, 8).map((item) => (
              <div key={item.subject} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-slate-800">
                    {item.subject}
                  </span>
                  <span className="font-black text-cyan-700">
                    {item.averagePercentage}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-cyan-600"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(item.averagePercentage, 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-rose-600">
            الطلاب المحتاجون متابعة
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            أولويات المتابعة
          </h2>

          <div className="mt-5 space-y-3">
            {(summary?.riskStudents || []).slice(0, 8).map((student) => (
              <div
                key={`${student.studentName}-${student.nationalId || ""}`}
                className="rounded-2xl bg-rose-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-slate-800">
                    {student.studentName}
                  </span>
                  <span className="font-black text-rose-700">
                    {student.averagePercentage}%
                  </span>
                </div>

                <p className="mt-2 text-sm font-bold leading-7 text-rose-800">
                  مواد تحتاج متابعة:{" "}
                  {student.weakSubjects.length
                    ? student.weakSubjects.join("، ")
                    : "غير محدد"}
                </p>
              </div>
            ))}

            {(summary?.riskStudents || []).length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                لا توجد بيانات طلاب منخفضي الأداء في هذا التحليل.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-cyan-600">عينة البيانات</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          أول النتائج المقروءة
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-3 font-black">الطالب</th>
                <th className="py-3 font-black">الصف</th>
                <th className="py-3 font-black">الفصل</th>
                <th className="py-3 font-black">المادة</th>
                <th className="py-3 font-black">الدرجة</th>
                <th className="py-3 font-black">النسبة</th>
                <th className="py-3 font-black">الحالة</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50">
                  <td className="py-3 font-black text-slate-900">
                    {row.studentName}
                  </td>
                  <td className="py-3 font-bold text-slate-500">
                    {row.grade || "-"}
                  </td>
                  <td className="py-3 font-bold text-slate-500">
                    {row.classroom || "-"}
                  </td>
                  <td className="py-3 font-bold text-slate-700">
                    {row.subject}
                  </td>
                  <td className="py-3 font-bold text-slate-700">
                    {row.score ?? "-"} / {row.maxScore ?? "-"}
                  </td>
                  <td className="py-3 font-black text-cyan-700">
                    {row.percentage ?? "-"}%
                  </td>
                  <td className="py-3 font-bold text-slate-500">
                    {getStatusLabel(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}