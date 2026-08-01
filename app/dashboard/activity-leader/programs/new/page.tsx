import Link from "next/link";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { sortRuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import {
  getActivityProgramDomainBySlug,
} from "@/lib/activity-programs/activity-program-catalog";
import { prisma } from "@/lib/prisma";
import { getWorkflowSlotTypeAliases } from "@/lib/workflows/workflow-slot";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewActivityProgramPage({
  searchParams,
}: PageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedDomain = getActivityProgramDomainBySlug(
    firstParam(params.domain) || "",
  );

  const workflow = await prisma.workflow.findFirst({
    where: {
      service: {
        slug: "activity-programs",
      },
      isActive: true,
      status: "ACTIVE",
      workflowType: { in: getWorkflowSlotTypeAliases("service-main") },
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
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: [{ activeKey: "desc" }, { version: "desc" }, { updatedAt: "desc" }],
  });

  if (!workflow) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-xs font-black text-amber-700">برامج النشاط</p>

          <h1 className="mt-3 text-2xl font-black text-amber-950">
            لا يوجد Workflow منشور لبرامج النشاط
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-amber-800">
            ارفع Workflow بطاقة تنفيذ برنامج نشاط طلابي من لوحة الأدمن، ثم ارجع لهذه الصفحة.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/dashboard/activity-leader/programs"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-200"
            >
              العودة لبرامج النشاط
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const runtimeWorkflow = {
    ...sortRuntimeWorkflow({
      id: workflow.id,
      name: workflow.name,
      serviceSlug: workflow.service.slug,
      workflowType: workflow.workflowType,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        order: step.order,
        fields: step.fields.map((field) => ({
          id: field.id,
          key: field.key,
          label: field.label,
          type: field.type,
          placeholder: field.placeholder,
          helpText: field.helpText,
          isRequired: field.isRequired,
          order: field.order,
          dependsOnFieldKey: field.dependsOnFieldKey,
          linkedToValue: field.linkedToValue,
          allowOther: field.allowOther,
          isRepeater: field.isRepeater,
          options: field.options.map((option) => ({
            id: option.id,
            label: option.label,
            value: option.value,
            order: option.order,
            linkedToValue: option.linkedToValue,
          })),
        })),
      })),
    }),
    studentPickerMode: workflow.studentPickerMode || "DISABLED",
    evidenceMode: workflow.evidenceMode || "SERVICE_DEFAULT",
  };

  return (
    <main className="space-y-6">
      <DynamicFormRenderer
        workflow={runtimeWorkflow}
        serviceId={workflow.serviceId}
        requiresStudent={false}
        initialValues={
          selectedDomain
            ? {
                activity_domain: selectedDomain.title,
              }
            : undefined
        }
        title={
          selectedDomain
            ? `بطاقة تنفيذ برنامج نشاط - ${selectedDomain.title}`
            : "بطاقة تنفيذ برنامج نشاط طلابي"
        }
      />
    </main>
  );
}
