import { SmartReportDocumentRenderer } from "@/components/report-engine/smart-report-document-renderer";
import {
  defaultSmartReportPayload,
  smartReportTypeDescriptions,
  smartReportTypeLabels,
} from "@/lib/report-engine/smart-report-defaults";
import type { SmartReportType } from "@/lib/report-engine/smart-report-types";

const centerSections = [
  {
    title: "القالب العام الذكي",
    description:
      "قالب A4 واحد مرن يعرض الترويسة، بيانات الحالة، تفاصيل Workflow، الوصف، الشواهد، والتوقيعات.",
    href: "/dashboard/admin/reports/templates",
    status: "المرحلة القادمة",
  },
  {
    title: "أنواع التقارير",
    description:
      "أنواع قليلة تخدم كل الخدمات بدل بناء تقرير مستقل لكل خدمة.",
    href: "/dashboard/admin/reports/types",
    status: "تأسيس",
  },
  {
    title: "ربط الخدمات",
    description:
      "ربط كل خدمة بنوع تقرير وقالب افتراضي بدون كتابة كود جديد لكل خدمة.",
    href: "/dashboard/admin/reports/service-bindings",
    status: "تأسيس",
  },
  {
    title: "قواعد الحقول",
    description:
      "تصنيف حقول Workflow إلى رئيسية، تفصيلية، نصية، مخفية، أو تقنية.",
    href: "/dashboard/admin/reports/field-rules",
    status: "تأسيس",
  },
  {
    title: "التقارير الصادرة",
    description:
      "أرشيف التقارير المحفوظة مع Snapshot حتى لا تتأثر بتغير Workflow لاحقًا.",
    href: "/dashboard/admin/reports/issued",
    status: "تأسيس",
  },
  {
    title: "إعدادات التقارير",
    description:
      "سياسات عامة للشواهد والتوقيعات والتصدير والهوية الرسمية.",
    href: "/dashboard/admin/reports/settings",
    status: "تأسيس",
  },
];

const reportTypes = Object.keys(smartReportTypeLabels) as SmartReportType[];

export function AdminReportsCenter() {
  return (
    <main className="min-h-screen bg-[#f5f8f6] px-6 py-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-700">
                مركز التقارير
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                إدارة التقارير الذكية
              </h1>

              <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-slate-500">
                هذا المركز هو طبقة الإدارة الجديدة للتقارير. الهدف أن يخدم
                1000 عميل و30 خدمة عبر محرك واحد، وقالب عام ذكي، وأنواع قليلة،
                وربط مرن بالخدمات والحقول.
              </p>
            </div>

            <div className="rounded-3xl bg-emerald-50 p-5 text-center">
              <p className="text-xs font-black text-emerald-700">
                القاعدة الأساسية
              </p>
              <p className="mt-2 text-lg font-black text-emerald-950">
                لا تقرير بدون Case ID
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {centerSections.map((section) => (
            <a
              key={section.title}
              href={section.href}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-black text-slate-950">
                  {section.title}
                </h2>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                  {section.status}
                </span>
              </div>

              <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
                {section.description}
              </p>
            </a>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-4">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">
                أنواع التقارير العامة
              </h2>

              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                هذه الأنواع تغطي أغلب الخدمات بدون الحاجة إلى بناء 30 تقريرًا منفصلًا.
              </p>

              <div className="mt-4 space-y-3">
                {reportTypes.map((type) => (
                  <div
                    key={type}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-sm font-black text-slate-900">
                      {smartReportTypeLabels[type]}
                    </p>
                    <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                      {smartReportTypeDescriptions[type]}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-5">
              <h2 className="text-base font-black text-amber-950">
                ملاحظة تنفيذ
              </h2>

              <p className="mt-2 text-sm font-bold leading-8 text-amber-800">
                هذه المرحلة تؤسس المكان والمحرك البصري فقط. المرحلة التالية تربط
                Case ID الحقيقي بـ Smart Report Payload ثم تحفظ Snapshot للتقرير الصادر.
              </p>
            </section>
          </div>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">
                  معاينة القالب العام الذكي
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  نفس الرندرر سيستخدم لاحقًا مع بيانات Case ID الحقيقية.
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                A4
              </span>
            </div>

            <div className="max-h-[820px] overflow-auto rounded-3xl bg-slate-100 p-4">
              <SmartReportDocumentRenderer payload={defaultSmartReportPayload} />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}