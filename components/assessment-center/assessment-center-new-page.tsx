import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { AssessmentCenterUploadClient } from "./assessment-center-upload-client";

const expectedFields = [
  "اسم الطالب",
  "رقم الهوية",
  "الصف",
  "الفصل",
  "المادة",
  "الدرجة",
  "الدرجة الكلية",
  "النسبة",
  "التقدير",
  "الفصل الدراسي",
  "العام الدراسي",
];

export function AssessmentCenterNewPage() {
  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-black text-cyan-50 backdrop-blur">
          <BrainCircuit className="h-4 w-4" />
          Assessment Upload Runtime
        </div>

        <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
          تحليل جديد
        </h1>

        <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
          ارفع ملف النتائج ليتم قراءة بيانات الطلاب والمواد والدرجات وإنشاء
          تحليل أولي داخل مركز التحليل والاختبارات.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <AssessmentCenterUploadClient />

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black text-cyan-600">
                شكل Excel الحالي
              </p>
              <h2 className="text-xl font-black text-slate-950">
                الأعمدة المدعومة الآن
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {expectedFields.map((field) => (
              <div
                key={field}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                <span className="text-sm font-black text-slate-700">
                  {field}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/assessment-center"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للمركز
          </Link>
        </aside>
      </section>
    </main>
  );
}