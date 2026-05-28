import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkflowHealthReport } from "@/components/admin/workflow-health/workflow-health-report";
import { validateWorkflow } from "@/engine/workflow-validation/workflow-validator";
import { dashboardServices } from "@/lib/constants/services";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

export default async function ServiceWorkflowPage({ params }: PageProps) {
  const { serviceSlug } = await params;

  const serviceConfig = dashboardServices.find(
    (service) => service.slug === serviceSlug
  );

  if (!serviceConfig) {
    notFound();
  }

  const service = await prisma.service.findUnique({
    where: {
      slug: serviceSlug,
    },
    include: {
      workflows: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
            },
          },
        },
        orderBy: {
          version: "desc",
        },
      },
    },
  });

  const activeWorkflow = service?.workflows.find((workflow) => workflow.isActive);

  const healthReport = activeWorkflow
    ? validateWorkflow({
        id: activeWorkflow.id,
        name: activeWorkflow.name,
        steps: activeWorkflow.steps.map((step) => ({
          id: step.id,
          title: step.title,
          fields: step.fields.map((field) => ({
            id: field.id,
            key: field.key,
            label: field.label,
            type: field.type,
            isRequired: field.isRequired,
            dependsOnFieldKey: field.dependsOnFieldKey,
            linkedToValue: field.linkedToValue,
            allowOther: field.allowOther,
            options: field.options.map((option) => ({
              id: option.id,
              label: option.label,
              value: option.value,
              linkedToValue: option.linkedToValue,
            })),
          })),
        })),
      })
    : null;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-bold text-sky-100">Service Workflow</p>

        <h1 className="mt-3 text-4xl font-black">{serviceConfig.title}</h1>

        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          إدارة Workflow الخاص بهذه الخدمة فقط.
        </p>

        <div className="mt-8">
          <Link
            href={`/dashboard/admin/workflows/${serviceSlug}/upload`}
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-700 hover:bg-sky-50"
          >
            رفع Workflow Excel
          </Link>
        </div>
      </section>

      {healthReport ? <WorkflowHealthReport report={healthReport} /> : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-2xl font-black text-slate-900">Workflow المفعل</h2>

        {activeWorkflow ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">الاسم</p>
              <p className="mt-1 text-xl font-black text-slate-900">
                {activeWorkflow.name}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Version {activeWorkflow.version} · {activeWorkflow.steps.length} خطوات
              </p>
            </div>

            {activeWorkflow.steps
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <div
                  key={step.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <h3 className="font-black text-slate-900">
                    {step.order}. {step.title}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {step.fields.length} حقول
                  </p>
                </div>
              ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-amber-50 p-6 text-sm font-bold text-amber-700">
            لا يوجد Workflow مفعل لهذه الخدمة.
          </div>
        )}
      </section>
    </div>
  );
}