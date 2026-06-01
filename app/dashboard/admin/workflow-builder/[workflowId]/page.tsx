import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { WORKFLOW_TYPES } from "@/lib/workflows/workflow-types";

type PageProps = {
  params: Promise<{
    workflowId: string;
  }>;
};

type WorkflowBuilderStep = {
  id: string;
  title: string;
  order: number;
  fields: Array<{
    id: string;
  }>;
};

export default async function WorkflowBuilderDetailsPage({ params }: PageProps) {
  await requireAdminPage();

  const { workflowId } = await params;

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      workflowType: WORKFLOW_TYPES.DEFAULT,
    },
    include: {
      service: true,
      steps: {
        include: {
          fields: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!workflow) {
    notFound();
  }

  const steps: WorkflowBuilderStep[] = workflow.steps.map((step) => ({
    id: step.id,
    title: step.title,
    order: step.order,
    fields: step.fields.map((field) => ({
      id: field.id,
    })),
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
        <p className="text-sm font-semibold text-sky-300">
          Workflow Builder
        </p>

        <h1 className="mt-3 text-4xl font-black">{workflow.name}</h1>

        <p className="mt-4 max-w-3xl leading-8 text-slate-300">
          خدمة: {workflow.service.name}
        </p>

        <div className="mt-8">
          <Link
            href={`/dashboard/admin/workflows/${workflow.service.slug}`}
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-900"
          >
            إدارة Workflow الخدمة
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-2xl font-black text-slate-900">
          خطوات الـ Workflow
        </h2>

        <div className="mt-6 space-y-4">
          {steps.map((step: WorkflowBuilderStep) => (
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
      </section>
    </div>
  );
}
