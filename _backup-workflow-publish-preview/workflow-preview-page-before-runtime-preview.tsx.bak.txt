import { notFound } from "next/navigation";

import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { prisma } from "@/lib/prisma";
import { dashboardServices } from "@/lib/constants/services";
import { WORKFLOW_TYPES } from "@/lib/workflows/workflow-types";

type PageProps = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

export default async function WorkflowPreviewPage({
  params,
}: PageProps) {
  await requireAdminPage();

  const { serviceSlug } = await params;

  const serviceConfig = dashboardServices.find(
    (service) => service.slug === serviceSlug
  );

  if (!serviceConfig) {
    notFound();
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      service: {
        slug: serviceSlug,
      },
      workflowType: WORKFLOW_TYPES.DEFAULT,
      status: "DRAFT",
    },
    include: {
      steps: {
        include: {
          fields: {
            include: {
              options: true,
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: {
      version: "desc",
    },
  });

  if (!workflow) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-700">
        لا يوجد Draft Workflow لهذه الخدمة.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-300">
          Workflow Preview
        </p>

        <h1 className="mt-3 text-4xl font-black">
          Preview - {workflow.name}
        </h1>

        <p className="mt-4 text-slate-300">
          Version {workflow.version}
        </p>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-6">
          {workflow.steps.map((step) => (
            <div
              key={step.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
            >
              <h2 className="text-xl font-black text-slate-900">
                {step.order}. {step.title}
              </h2>

              <div className="mt-5 grid gap-4">
                {step.fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">
                        {field.label}
                      </p>

                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                        {field.type}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      key: {field.key}
                    </p>

                    {field.options.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {field.options.map((option) => (
                          <span
                            key={option.id}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                          >
                            {option.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
