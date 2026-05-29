import Link from "next/link";

const services = [
  {
    title: "متابعة الطلاب",
    description: "متابعة الحالات الفردية والطلابية عبر Workflow ديناميكي.",
    href: "/dashboard/student-follow-up",
  },
  {
    title: "التواصل بين الأسرة والمدرسة",
    description: "توثيق التواصل مع ولي الأمر ونتائج التواصل والمتابعة.",
    href: "/dashboard/family-school-communication",
  },
  {
    title: "اللجان والاجتماعات",
    description: "إدارة محاضر اللجان والاجتماعات والتوصيات.",
    href: "/dashboard/committees-meetings",
  },
  {
    title: "البرامج الإرشادية",
    description: "إنشاء وتنفيذ البرامج الإرشادية وربطها بالشواهد.",
    href: "/dashboard/guidance-programs",
  },
  {
    title: "تحليل النتائج",
    description: "رفع Excel نتائج الطلاب وتحليلها وحفظ التحليلات.",
    href: "/dashboard/results-analysis",
  },
  {
    title: "مركز الحالات",
    description: "عرض جميع السجلات والحالات المحفوظة من كل الخدمات.",
    href: "/dashboard/cases",
  },
  {
    title: "استيراد الطلاب",
    description: "رفع بيانات الطلاب من نظام نور وتجهيزها للاستخدام.",
    href: "/dashboard/student-import",
  },
  {
    title: "إدارة Workflows",
    description: "رفع وإدارة نماذج الخدمات من لوحة الأدمن.",
    href: "/dashboard/admin/workflows",
  },
];

export default function DashboardPage() {
  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-700 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-300">Dashboard</p>

        <h1 className="mt-4 text-5xl font-black">
          منصة التوجيه الطلابي
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">
          جميع الخدمات في مكان واحد، مع Workflow موحد، حالات محفوظة،
          شواهد، وتحليلات قابلة للتوسع.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <Link
            key={service.href}
            href={service.href}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
          >
            <h2 className="text-2xl font-black text-slate-900">
              {service.title}
            </h2>

            <p className="mt-3 min-h-14 text-sm leading-7 text-slate-500">
              {service.description}
            </p>

            <div className="mt-6 text-sm font-black text-sky-600">
              فتح الخدمة ←
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}