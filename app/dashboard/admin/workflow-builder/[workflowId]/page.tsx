import { notFound } from "next/navigation";

import { WorkflowFieldEditor } from "@/components/admin/workflow-field-editor";
import { WorkflowPreviewPanel } from "@/components/admin/workflow-preview-panel";
import { WorkflowStepEditor } from "@/components/admin/workflow-step-editor";

import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    workflowId: string;
  }>;
};

export default async function WorkflowBuilderDetailsPage({
  params,
}: PageProps) {
  const { workflowId } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: {
      id: workflowId,
    },
    include: {
      service: true,
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
  });

  if (!workflow) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
        <p className="text-sm font-semibold text-sky-300">
          Workflow Builder
        </p>

        <h1 className="mt-3 text-4xl font-black">
          {workflow.name}
        </h1>

        <p className="mt-4 max-w-3xl leading-8 text-slate-300">
          خدمة: {workflow.service.name}
        </p>
      </section>

      <WorkflowPreviewPanel />

      <WorkflowFieldEditor
  firstStepId={workflow.steps[0]?.id}
/>

      <WorkflowStepEditor
  workflowId={workflow.id}
        steps={workflow.steps
          .sort((a, b) => a.order - b.order)
          .map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            order: step.order,
            fields: step.fields
              .sort((a, b) => a.order - b.order)
              .map((field) => ({
                id: field.id,
                label: field.label,
                key: field.key,
                type: field.type,
              })),
          }))}
      />
    </div>
  );
}