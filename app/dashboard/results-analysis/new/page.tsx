import { ResultsAnalysisUploadCard } from "@/components/results-analysis/results-analysis-upload-card";

export default function NewResultsAnalysisPage() {
  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-500 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-blue-100">
          Results Analysis Runtime
        </p>

        <h1 className="mt-4 text-5xl font-black">تحليل نتائج جديد</h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-50">
          ارفع ملف Excel وحدد بيانات التحليل ليتم حفظه وعرض لوحة مؤشرات تفصيلية.
        </p>
      </section>

      <ResultsAnalysisUploadCard />
    </main>
  );
}