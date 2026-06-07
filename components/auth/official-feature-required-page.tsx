import Link from "next/link";

type MissingItem = {
  label: string;
  required?: boolean;
};

export function OfficialFeatureRequiredPage({
  title = "إكمال الهوية الرسمية مطلوب",
  description = "هذه الميزة تعتمد على بيانات المدرسة والموجه/الموجهة حتى يظهر الناتج بشكل رسمي وجاهز للطباعة.",
  missingItems = [],
}: {
  title?: string;
  description?: string;
  missingItems?: MissingItem[];
}) {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-950 px-8 py-8 text-white">
          <p className="text-sm font-black text-amber-200">حماية جودة التقارير الرسمية</p>

          <h1 className="mt-3 text-3xl font-black leading-[1.6]">
            {title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-8 text-slate-300">
            {description}
          </p>
        </div>

        <div className="grid gap-6 p-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-black text-amber-900">
                لماذا نطلب هذه البيانات؟
              </p>

              <p className="mt-2 text-sm font-bold leading-8 text-amber-800">
                لأن التقارير الرسمي سيظهر فيه اسم المدرسة، إدارة التعليم، العام الدراسي،
                واسم الموجه/الموجهة. إكمالها الآن يمنع خروج تقارير ناقصة أو غير مهنية.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-950">
                البيانات المطلوبة قبل المتابعة
              </p>

              {missingItems.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {missingItems.map((item) => (
                    <div
                      key={item.label}
                      className={[
                        "rounded-2xl px-4 py-3 text-sm font-bold",
                        item.required
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  يبدو أن البيانات الأساسية مكتملة. حدّث الصفحة أو ارجع وحاول مرة أخرى.
                </p>
              )}
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-2xl text-white">
              ✓
            </div>

            <h2 className="mt-5 text-xl font-black leading-8 text-slate-950">
              خطوة واحدة وتصبح التقارير جاهزة رسميًا
            </h2>

            <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
              بعد إكمال الهوية، لن تحتاج لإدخال هذه البيانات في كل تقرير.
            </p>

            <Link
              href="/dashboard/settings/school"
              className="mt-6 block rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800"
            >
              إكمال هوية المدرسة
            </Link>

            <Link
              href="/dashboard"
              className="mt-3 block rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              العودة للرئيسية
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
