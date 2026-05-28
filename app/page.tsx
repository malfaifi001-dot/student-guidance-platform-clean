import Link from "next/link";
import {
  ArrowUpLeft,
  BarChart3,
  BrainCircuit,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNavbar />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-100/60 via-transparent to-transparent" />

          <div className="container-app relative py-24 md:py-32">
            <div className="max-w-4xl">
              <div className="mb-6 inline-flex rounded-full border border-sky-200 bg-sky-50 px-5 py-2 text-sm font-semibold text-sky-700">
                Workflow Runtime · SaaS-ready · School Platform
              </div>

              <h1 className="text-5xl font-black leading-[1.2] text-slate-900 md:text-7xl">
                منصة حديثة لإدارة
                <span className="block text-sky-600">
                  التوجيه الطلابي والخدمات المدرسية
                </span>
              </h1>

              <p className="mt-8 max-w-3xl text-lg leading-9 text-slate-600">
                منصة ذكية للموجه والموجهة الطلابية تدعم:
                إدارة الحالات، الاجتماعات، البرامج،
                الشواهد، التقارير، بيانات نور،
                Workflow Runtime، والاشتراكات SaaS.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="rounded-3xl bg-sky-600 px-8 py-4 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  ابدأ الآن
                </Link>

                <Link
                  href="/services"
                  className="rounded-3xl border border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  استعراض الخدمات
                </Link>
              </div>
            </div>

            <div className="mt-20 grid gap-5 md:grid-cols-3">
              {[
                {
                  title: "Workflow Engine",
                  icon: Workflow,
                  desc: "محرك ديناميكي موحد لكل الخدمات.",
                },
                {
                  title: "Noor Integration",
                  icon: Database,
                  desc: "رفع ذكي لملفات نور وربط الطلاب.",
                },
                {
                  title: "Reports & Export",
                  icon: FileSpreadsheet,
                  desc: "تقارير وتصدير Word/PDF لاحقًا.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow"
                >
                  <item.icon className="mb-5 h-8 w-8 text-sky-600" />

                  <h3 className="text-xl font-black text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-app py-20">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold text-sky-700">
              المميزات الأساسية
            </p>

            <h2 className="mt-3 text-4xl font-black text-slate-900">
              مبنية للمستقبل من البداية
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Workflow Runtime",
                icon: Workflow,
              },
              {
                title: "Case Engine",
                icon: ShieldCheck,
              },
              {
                title: "Results Analysis",
                icon: BarChart3,
              },
              {
                title: "AI-ready مستقبلًا",
                icon: BrainCircuit,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <item.icon className="mb-5 h-7 w-7 text-sky-600" />

                <h3 className="text-lg font-black text-slate-900">
                  {item.title}
                </h3>

                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-sky-700">
                  استكشاف
                  <ArrowUpLeft className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}