import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  LockKeyhole,
} from "lucide-react";

const expectedFields = [
  "اسم الطالب",
  "رقم الهوية أو السجل المدني",
  "الصف",
  "الفصل أو الشعبة",
  "المادة",
  "الدرجة",
  "الدرجة الكلية",
  "النسبة",
  "التقدير",
  "الفصل الدراسي",
  "العام الدراسي",
];

const uploadModes = [
  "رفع شامل لكل المدرسة مرة واحدة.",
  "رفع منفصل لكل صف.",
  "رفع منفصل لكل فصل.",
  "رفع منفصل لكل مادة.",
  "رفع اختبارات متعددة على مراحل.",
];

const futureCapabilities = [
  "قراءة Excel بعد اعتماد الشكل النهائي.",
  "اكتشاف العناوين تلقائيًا مثل رفع بيانات الطلاب.",
  "ربط النتائج مع الطلاب الموجودين في Data Center.",
  "تحليل المواد والصفوف والفصول.",
  "استخراج الطلاب المحتاجين متابعة.",
  "تصدير Excel للتحليل كاملًا.",
  "تصدير PDF بقالب جميل وعملي.",
  "تجهيز توصيات علاجية قابلة للتحويل إلى حالة متابعة.",
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
          هذه الصفحة مخصصة لاحقًا لرفع ملفات النتائج. تم تجهيز المكان الآن،
          وسيتم تفعيل قراءة Excel بعد اعتماد شكل الملف النهائي.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <LockKeyhole className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-950">
                رفع Excel مؤجل مؤقتًا
              </h2>

              <p className="mt-3 text-sm font-bold leading-8 text-slate-500">
                لن نبني Parser الآن حتى لا نربط النظام بشكل ملف غير نهائي.
                عندما يتضح شكل ملف النتائج، نضيف القراءة والتحليل الحقيقي
                بدون تغيير هيكل المركز.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5">
            <div className="flex gap-3">
              <Info className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm font-bold leading-8 text-amber-900">
                المركز سيدعم لاحقًا أكثر من طريقة إدخال: رفع شامل، أو رفع على
                دفعات حسب الصف أو الفصل أو المادة.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/assessment-center"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowRight className="h-4 w-4" />
              العودة للمركز
            </Link>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black text-cyan-600">
                شكل Excel المتوقع
              </p>
              <h2 className="text-xl font-black text-slate-950">
                الحقول التي سنحاول قراءتها
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
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-cyan-600">طرق الرفع المستقبلية</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            مرونة حسب شكل الملف النهائي
          </h2>

          <div className="mt-6 grid gap-3">
            {uploadModes.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold leading-7 text-slate-600">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-cyan-600">المرحلة القادمة</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            ما الذي سيتم تفعيله لاحقًا؟
          </h2>

          <div className="mt-6 grid gap-3">
            {futureCapabilities.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold leading-7 text-slate-600">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}