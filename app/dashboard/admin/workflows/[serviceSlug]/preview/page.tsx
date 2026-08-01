import { notFound } from "next/navigation";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { dashboardServices } from "@/lib/constants/services";
import { prisma } from "@/lib/prisma";
import { getWorkflowSlotTypeAliases } from "@/lib/workflows/workflow-slot";

type PageProps = {
  params: Promise<{
    serviceSlug: string;
  }>;
  searchParams?: Promise<{
    workflowId?: string;
  }>;
};

export default async function WorkflowPreviewPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdminPage();

  const { serviceSlug } = await params;
  const query = searchParams ? await searchParams : {};
  const selectedWorkflowId = String(query?.workflowId || "").trim();

  const serviceConfig = dashboardServices.find(
    (service) => service.slug === serviceSlug,
  );

  if (!serviceConfig) {
    notFound();
  }

  const workflow = await prisma.workflow.findFirst({
    where: selectedWorkflowId
      ? {
          id: selectedWorkflowId,
          service: {
            slug: serviceSlug,
          },
        }
      : {
          service: {
            slug: serviceSlug,
          },
          workflowType: { in: getWorkflowSlotTypeAliases("service-main") },
          OR: [
            {
              status: "DRAFT",
            },
            {
              status: "ACTIVE",
              isActive: true,
            },
          ],
        },
    include: {
      service: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      steps: {
        include: {
          fields: {
            include: {
              options: {
                orderBy: {
                  order: "asc",
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: selectedWorkflowId
      ? undefined
      : [
          {
            status: "asc",
          },
          {
            activeKey: "desc",
          },
          {
            version: "desc",
          },
        ],
  });

  if (!workflow) {
    return (
      <main className="space-y-5" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-800">
          <p className="text-sm font-black">Workflow Preview</p>

          <h1 className="mt-2 text-3xl font-black">
            لا يوجد Workflow للمعاينة
          </h1>

          <p className="mt-3 text-sm font-bold leading-7">
            ارفع ملف Excel أو اختر نسخة محفوظة من سجل المرفوعات.
          </p>
        </section>
      </main>
    );
  }

  const runtimeWorkflow = {
    id: workflow.id,
    name: workflow.name,
    serviceSlug: workflow.service.slug,
    workflowType: workflow.workflowType,
    studentPickerMode: workflow.studentPickerMode || "SERVICE_DEFAULT",
    evidenceMode: workflow.evidenceMode || "SERVICE_DEFAULT",
    steps: workflow.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: String(field.type),
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        allowOther: field.allowOther,
        isRepeater: field.isRepeater,
        dependsOnFieldKey: field.dependsOnFieldKey,
        linkedToValue: field.linkedToValue,
        options: field.options.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  };

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black text-sky-700">
              Workflow Preview
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              معاينة تجربة الموجه - {serviceConfig.title}
            </h1>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              النسخة: {workflow.name} · Version {workflow.version}
            </p>
          </div>

          <span
            className={[
              "rounded-full px-4 py-2 text-xs font-black ring-1",
              workflow.isActive
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : workflow.status === "DRAFT"
                  ? "bg-sky-50 text-sky-700 ring-sky-100"
                  : "bg-slate-50 text-slate-600 ring-slate-200",
            ].join(" ")}
          >
            {workflow.isActive
              ? "مفعل حاليًا"
              : workflow.status === "DRAFT"
                ? "مسودة"
                : workflow.status}
          </span>
        </div>
      </section>

      <DynamicFormRenderer
        workflow={runtimeWorkflow}
        serviceId={workflow.service.id}
        title={`معاينة - ${workflow.name}`}
        previewMode
      />
    </main>
  );
}
