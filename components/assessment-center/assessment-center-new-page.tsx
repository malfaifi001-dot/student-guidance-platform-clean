import { UploadCloud } from "lucide-react";
import { AssessmentCenterUploadClient } from "./assessment-center-upload-client";

const steps = ["١. اختر الملف", "٢. ابدأ التحليل", "٣. راجع النتائج"];

export function AssessmentCenterNewPage() {
  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
        <h1 className="text-4xl font-black leading-tight md:text-5xl">
          رفع نتائج الطلاب
        </h1>

        <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
          ارفع ملف Excel لقراءة النتائج.
        </p>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
            <UploadCloud className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-black text-cyan-600">الخطوات</p>
            <h2 className="text-2xl font-black text-slate-950">
              كيف تبدأ؟
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step}
              className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center"
            >
              <p className="text-sm font-black text-slate-900">{step}</p>
            </article>
          ))}
        </div>
      </section>

      <AssessmentCenterUploadClient />
    </main>
  );
}
