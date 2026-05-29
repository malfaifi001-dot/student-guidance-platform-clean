import Link from "next/link";
import { DeleteResultsAnalysisButton } from "./delete-results-analysis-button";

type AnalysisItem = {
  id: string;
  title: string;
  grade: string | null;
  classroom: string | null;
  sourceFile: string | null;
  totalStudents: number;
  totalSubjects: number;
  averageScore: number | null;
  createdAt: Date;
};

type Props = {
  analyses: AnalysisItem[];
};

export function ResultsAnalysisList({ analyses }: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-8 py-6">
        <h2 className="text-3xl font-black text-slate-900">
          التحليلات السابقة
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          كل تحليل محفوظ يمكن فتحه أو حذفه لاحقًا.
        </p>
      </div>

      {analyses.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          لا توجد تحليلات محفوظة حتى الآن.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  العنوان
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الصف
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الشعبة
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الطلاب
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  المواد
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  المتوسط
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  التاريخ
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الإجراء
                </th>
              </tr>
            </thead>

            <tbody>
              {analyses.map((analysis) => (
                <tr key={analysis.id} className="border-t border-slate-100">
                  <td className="px-6 py-5">
                    <div className="font-black text-slate-900">
                      {analysis.title}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {analysis.sourceFile || "ملف غير محدد"}
                    </div>
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-600">
                    {analysis.grade || "الكل"}
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-600">
                    {analysis.classroom || "الكل"}
                  </td>

                  <td className="px-6 py-5 font-black text-slate-900">
                    {analysis.totalStudents}
                  </td>

                  <td className="px-6 py-5 font-black text-slate-900">
                    {analysis.totalSubjects}
                  </td>

                  <td className="px-6 py-5 font-black text-blue-600">
                    {analysis.averageScore ?? 0}%
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-500">
                    {new Date(analysis.createdAt).toLocaleDateString("ar-SA")}
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/results-analysis/${analysis.id}`}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        فتح التحليل
                      </Link>

                      <DeleteResultsAnalysisButton analysisId={analysis.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}