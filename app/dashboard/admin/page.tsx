import Link from "next/link";

const adminSections = [
  {
    title: "إدارة Workflows",
    description:
      "رفع واعتماد ومعاينة Workflows الخاصة بالخدمات الإرشادية قبل نشرها للموجهين.",
    href: "/dashboard/admin/workflows",
    badge: "Workflow Runtime",
  },
  {
    title: "مصمم Workflow",
    description:
      "بناء خطوات وحقول Workflow يدويًا للخدمات، مع تجهيز مستقبلي للتبعيات والخيارات.",
    href: "/dashboard/admin/workflow-builder",
    badge: "Builder",
  },
  {
    title: "قوالب التقارير",
    description:
      "إدارة القوالب الرسمية والشخصية للتقارير، وربطها بالخدمات والحالات.",
    href: "/dashboard/admin/report-templates",
    badge: "Reports",
  },
  {
    title: "إنشاء قالب تقرير",
    description:
      "إنشاء قالب تقرير جديد وتجهيزه للمعاينة والنشر داخل محرك التقارير.",
    href: "/dashboard/admin/report-templates/new",
    badge: "Template",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="space-y-8" dir="rtl">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-100">Admin Center</p>

        <h1 className="mt-4 text-5xl font-black">لوحة الإدارة</h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-100">
          مركز إدارة المنصة: إدارة الخدمات، Workflows، القوالب، وتجهيزات التقارير.
          هذه الصفحة تجمع أدوات الأدمن في مكان واحد بدل الدخول لكل رابط يدويًا.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {adminSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                {section.badge}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white">
                فتح
              </span>
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              {section.title}
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              {section.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-black text-amber-900">ملاحظة مهمة</h2>

        <p className="mt-2 text-sm leading-7 text-amber-800">
          هذه الصفحة هي بوابة الأدمن فقط. كل أداة لها صفحة مستقلة حتى تبقى
          المعمارية نظيفة وما يصير خلط بين إدارة Workflow والتقارير والخدمات.
        </p>
      </section>
    </main>
  );
}