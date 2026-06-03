import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

const designs = [
  {
    key: "minimal-guidance-report",
    title: "تقرير رسمي مختصر",
    type: "تقرير",
    service: "عام لكل الخدمات",
    description:
      "تصميم هادئ ومختصر: غلاف رسمي، محتوى ذكي، واعتماد. مناسب للتقارير السريعة والرسمية.",
    previewHref: "/dashboard/admin/document-designs/minimal-guidance-report",
    useHref: "/dashboard/admin/report-templates?design=minimal-guidance-report",
    status: "جديد",
  },
  {
    key: "visual-program-report",
    title: "تقرير بصري للبرامج",
    type: "تقرير بصري",
    service: "البرامج الإرشادية",
    description:
      "تصميم مختلف بصريًا للبرامج والأنشطة، يركز على العنوان والوصف والشواهد بطريقة خفيفة.",
    previewHref: "/dashboard/admin/document-designs/visual-program-report",
    useHref: "/dashboard/admin/report-templates?design=visual-program-report",
    status: "جاهز",
  },
  {
    key: "evidence-rich-report",
    title: "تقرير الشواهد المصور",
    type: "شواهد",
    service: "عام أو حسب الخدمة",
    description:
      "تصميم مخصص للتقارير التي تعتمد على الصور. الشواهد تكون في صفحات مستقلة ويمكن ضبط عرضها لاحقًا.",
    previewHref: "/dashboard/admin/document-designs/evidence-rich-report",
    useHref: "/dashboard/admin/report-templates?design=evidence-rich-report",
    status: "جديد",
  },
  {
    key: "appreciation-certificate-v1",
    title: "شهادة شكر وتقدير",
    type: "شهادة",
    service: "متابعة الطلاب",
    description:
      "قالب شهادة رسمي. التصميم ثابت، والمتغيرات من هوية المدرسة وبيانات الطالب وسجل المتابعة.",
    previewHref: "/dashboard/admin/document-designs/appreciation-certificate",
    useHref: "/dashboard/admin/report-templates?design=appreciation-certificate-v1",
    status: "جاهز",
  },
  {
    key: "guardian-summons-letter-v1",
    title: "استدعاء ولي أمر",
    type: "خطاب",
    service: "التواصل بين الأسرة والمدرسة",
    description:
      "نموذج رسمي لاستدعاء ولي أمر، يسحب بيانات الطالب وولي الأمر وموعد الحضور وسبب الاستدعاء.",
    previewHref: "/dashboard/admin/document-designs/guardian-summons",
    useHref: "/dashboard/admin/report-templates?design=guardian-summons-letter-v1",
    status: "جاهز",
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

        <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
          هنا تختار التصميم المناسب قبل دخوله إلى استديو القوالب. كل تصميم له
          هوية مختلفة، لكن جميعها تحافظ على الترويسة الرسمية وشعار وزارة التعليم
          والمتغيرات الديناميكية واختبار Case ID قبل النشر.
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
              التوجيه: {design.service}
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
                فتحه داخل الاستديو
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
