"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/dashboard/student-follow-up/appreciation-certificates",
    label: "إصدار شهادات الشكر",
    description: "إنشاء شهادة شكر وتقدير من بيانات الطالب والمتابعة.",
    badge: "إصدار",
  },
  {
    href: "/dashboard/student-follow-up/appreciation-certificates/statistics",
    label: "الإحصائيات والمتابعة",
    description: "تحليل الشهادات الصادرة ومجالات التميز.",
    badge: "تحليل",
  },
  {
    href: "/dashboard/admin/document-designs/appreciation-certificate",
    label: "قالب الشهادة",
    description: "معاينة القالب الرسمي والمتغيرات الديناميكية.",
    badge: "قالب",
  },
];

export function AppreciationCertificatesTabs() {
  const pathname = usePathname();

  return (
    <section className="space-y-4" dir="rtl">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-emerald-700">
              متابعة الطلاب
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-900">
              شهادات الشكر والتقدير
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              تبويبة مستقلة لشهادات الشكر داخل خدمة متابعة الطلاب، تشمل الإصدار
              والسجل والإحصائيات والقالب الرسمي.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
            خدمة فرعية
          </span>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.href.includes("/statistics") &&
                pathname.startsWith(tab.href)) ||
              (tab.href.includes("/document-designs") &&
                pathname.startsWith(tab.href));

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "rounded-3xl border p-4 transition",
                  active
                    ? "border-emerald-300 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-emerald-200 hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2
                    className={[
                      "text-sm font-black",
                      active ? "text-emerald-800" : "text-slate-900",
                    ].join(" ")}
                  >
                    {tab.label}
                  </h2>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-[11px] font-black",
                      active
                        ? "bg-white text-emerald-700"
                        : "bg-white text-slate-500",
                    ].join(" ")}
                  >
                    {tab.badge}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {tab.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
