import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { dashboardServices } from "@/lib/constants/services";
import { prisma } from "@/lib/prisma";
import { GuardianSummonsWorkflowAdminCard } from "@/components/admin/workflows/guardian-summons-workflow-admin-card";

export default async function AdminWorkflowsPage() {
  const workflows = await prisma.workflow.findMany({
    where: {
      isActive: true,
    },
    include: {
      service: true,
      steps: true,
    },
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-300">Admin Workflows</p>
        <h1 className="mt-3 text-4xl font-black">إدارة Workflows الخدمات</h1>
        <p className="mt-4 max-w-3xl leading-8 text-slate-300">
          كل Workflow يتم ربطه بخدمة محددة. النماذج الفرعية مثل استدعاء ولي أمر تظهر داخل الخدمة الأم، لكنها تعمل كـ Workflow مستقل.
        </p>
      </section>

      <GuardianSummonsWorkflowAdminCard />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardServices.map((service) => {
          const activeWorkflow = workflows.find(
            (workflow) => workflow.service.slug === service.slug
          );

          return (
            <Link
              key={service.slug}
              href={`/dashboard/admin/workflows/${service.slug}`}
              className="group rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
                    {service.kind === "workflow" ? "Workflow Service" : "Standalone"}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                    {service.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    {service.description}
                  </p>
                </div>

                <ArrowUpLeft className="h-5 w-5 text-slate-400 group-hover:text-sky-600" />
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                {activeWorkflow ? (
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">
                    مفعل: {activeWorkflow.name} · {activeWorkflow.steps.length} خطوات
                  </p>
                ) : (
                  <p className="font-bold text-slate-400">
                    لا يوجد Workflow مفعل
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
