import Link from "next/link";
import { ArrowUpLeft, Database, Layers3, LockKeyhole, Workflow } from "lucide-react";
import { dashboardServices, workflowServices } from "@/lib/constants/services";
import { serviceColors } from "@/lib/design/tokens";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-500 p-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex rounded-full bg-white/15 px-4 py-1 text-sm">
            Clean Architecture · Workflow Runtime · SaaS-ready
          </p>
          <h1 className="text-3xl font-bold md:text-5xl">
            منصة التوجيه الطلابي ببنية جاهزة للمستقبل
          </h1>
          <p className="mt-4 text-base leading-8 text-sky-50">
            أساس موحد للخدمات، الحالات، الشواهد، بيانات نور، التقارير، الاشتراكات،
            الدفع الإلكتروني، التحويل البنكي، والربط المستقبلي مع APIs خارجية.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "خدمات Workflow", value: workflowServices.length, icon: Workflow },
          { label: "محرك حالات موحد", value: "Case Engine", icon: Layers3 },
          { label: "قاعدة SaaS", value: "Ready", icon: LockKeyhole },
          { label: "Prisma Foundation", value: "Active", icon: Database },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <item.icon className="mb-4 h-6 w-6 text-sky-600" />
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">الخدمات</h2>
            <p className="mt-1 text-sm text-slate-500">كل خدمة لها مسار مستقل وسترتبط لاحقًا بالمحرك الموحد.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardServices.map((service) => (
            <Link
              key={service.slug}
              href={service.href}
              className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className={`mb-5 h-2 rounded-full bg-gradient-to-l ${
                  serviceColors[service.slug] ?? "from-slate-500 to-slate-700"
                }`}
              />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{service.description}</p>
                </div>
                <ArrowUpLeft className="h-5 w-5 text-slate-400 transition group-hover:text-sky-600" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}