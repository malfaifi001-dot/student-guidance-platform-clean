import { prisma } from "@/lib/prisma";
import { sortRuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import { getWorkflowSlotTypeAliases } from "@/lib/workflows/workflow-slot";
import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";

const SERVICE_SLUG = "student-guidance-evaluation-indicators";

export default async function NewStudentGuidanceEvaluationIndicatorPage() {
  const workflow = await prisma.workflow.findFirst({
    where: {
      service: {
        slug: SERVICE_SLUG,
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
      <main className="space-y-6">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-900">
            لا يوجد Workflow منشور
          </h1>

          <p className="mt-3 text-sm text-amber-700">
            قم برفع Workflow لخدمة مؤشرات التوجيه الطلابي للتقويم المدرسي
            والتقويم الخارجي أولًا.
          </p>
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
    studentPickerMode: workflow.studentPickerMode || "SERVICE_DEFAULT",
    evidenceMode: workflow.evidenceMode || "SERVICE_DEFAULT",
  };

  return (
    <main className="space-y-6">
      <DynamicFormRenderer
        workflow={runtimeWorkflow}
        serviceId={workflow.serviceId}
        requiresStudent={false}
        title="مؤشر توجيه طلابي جديد"
      />
    </main>
  );
}
