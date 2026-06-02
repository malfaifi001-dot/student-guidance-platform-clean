import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

const designs = [
  {
    key: "guardian-summons-letter-v1",
    title: "استدعاء ولي أمر",
    type: "خطاب",
    service: "التواصل بين الأسرة والمدرسة",
    description:
      "نموذج رسمي لاستدعاء ولي أمر الطالب، يسحب بيانات الطالب وولي الأمر وموعد الحضور وأسباب الاستدعاء من Workflow الاستدعاء.",
    previewHref: "/dashboard/admin/document-designs/guardian-summons",
    useHref: "/dashboard/admin/report-templates?design=guardian-summons-letter-v1",
    status: "جاهز للاستخدام",
  },
  {
    key: "official-school-report",
    title: "قالب رسمي مدرسي",
    type: "تقرير",
    service: "عام لكل الخدمات",
    description:
      "قالب رسمي متعدد الصفحات مناسب للتقارير الطويلة: غلاف، ملخص، تفاصيل، شواهد، واعتماد.",
    previewHref: "/dashboard/admin/document-designs/official-school-report",
    useHref: "/dashboard/admin/report-templates?design=official-school-report",
    status: "جاهز للاستخدام",
  },
  {
    key: "visual-program-report",
    title: "قالب بصري للبرامج",
    type: "تقرير بصري",
    service: "البرامج الإرشادية",
    description:
      "قالب مختصر وجذاب للبرامج والأنشطة، يركز على العنوان والوصف والشواهد بشكل بصري خفيف.",
    previewHref: "/dashboard/admin/document-designs/visual-program-report",
    useHref: "/dashboard/admin/report-templates?design=visual-program-report",
    status: "جاهز للاستخدام",
  },
];

export default async function AdminDocumentDesignsPage() {
  await requireAdminPage();

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-emerald-700">مصنع القوالب</p>

        <h1 className="mt-2 text-2xl font-black text-slate-900">
          معرض التصاميم والنماذج
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          هنا نستعرض التصاميم الجاهزة قبل استخدامها. عند اختيار تصميم سيتم نسخه
          إلى مصمم القوالب كقالب مستقل يمكن تعديل صفحاته وبلوكاته ونصوصه وحقوله.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {designs.map((design) => (
          <article
            key={design.key}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {design.type}
                </span>

                <h2 className="mt-4 text-xl font-black text-slate-900">
                  {design.title}
                </h2>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                {design.status}
              </span>
            </div>

            <p className="mt-3 text-xs font-bold text-slate-500">
              الخدمة: {design.service}
            </p>

            <p className="mt-3 min-h-20 text-sm leading-7 text-slate-600">
              {design.description}
            </p>

            <div className="mt-5 grid gap-2">
              <Link
                href={design.previewHref}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                معاينة التصميم
              </Link>

              <Link
                href={design.useHref}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                استخدام هذا التصميم
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
