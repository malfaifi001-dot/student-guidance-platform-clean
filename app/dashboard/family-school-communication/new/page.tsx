import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { ensureServiceBySlug } from "@/engine/services/service-workspace-engine";
import { prisma } from "@/lib/prisma";
import { buildActiveWorkflowSlotQuery } from "@/lib/workflows/active-workflow-resolver";
import { getWorkflowActivationSlot } from "@/lib/workflows/workflow-slot";

async function ensureFamilyCommunicationWorkflow() {
  const service = await ensureServiceBySlug({
    slug: "family-school-communication",
    name: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    description: "توثيق التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور.",
  });

  const existingWorkflow = await prisma.workflow.findFirst({
    ...buildActiveWorkflowSlotQuery({ serviceId: service.id }),
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
  });

  if (existingWorkflow) return { service, workflow: existingWorkflow };

  const workflow = await prisma.workflow.create({
    data: {
      serviceId: service.id,
      name: "نموذج التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
      version: 1,
      status: "ACTIVE",
      isActive: true,
      workflowType: "service-main",
      activeKey: getWorkflowActivationSlot({ serviceId: service.id, workflowType: "service-main" }),
      steps: {
        create: [
          {
            title: "بيانات التواصل",
            description: "حدد طريقة التواصل وسببه.",
            order: 1,
            fields: {
              create: [
                {
                  key: "communication_method",
                  label: "طريقة التواصل",
                  type: "SELECT",
                  isRequired: true,
                  order: 1,
                  options: {
                    create: [
                      { label: "اتصال هاتفي", value: "phone", order: 1 },
                      { label: "رسالة", value: "message", order: 2 },
                      { label: "حضور ولي الأمر", value: "visit", order: 3 },
                    ],
                  },
                },
                {
                  key: "communication_reason",
                  label: "سبب التواصل",
                  type: "SELECT",
                  isRequired: true,
                  order: 2,
                  allowOther: true,
                  options: {
                    create: [
                      { label: "غياب الطالب", value: "absence", order: 1 },
                      { label: "ضعف تحصيلي", value: "low_achievement", order: 2 },
                      { label: "سلوك داخل المدرسة", value: "behavior", order: 3 },
                    ],
                  },
                },
              ],
            },
          },
          {
            title: "محتوى التواصل",
            description: "وثّق ما تم مناقشته والنتيجة.",
            order: 2,
            fields: {
              create: [
                {
                  key: "discussion_summary",
                  label: "ما تم مناقشته",
                  type: "TEXTAREA",
                  isRequired: true,
                  order: 1,
                },
                {
                  key: "communication_result",
                  label: "نتيجة التواصل",
                  type: "SELECT",
                  isRequired: true,
                  order: 2,
                  allowOther: true,
                  options: {
                    create: [
                      { label: "تم الاتفاق على متابعة", value: "followup", order: 1 },
                      { label: "تم حل المشكلة", value: "resolved", order: 2 },
                      { label: "لم يتم الرد", value: "no_response", order: 3 },
                    ],
                  },
                },
                {
                  key: "notes",
                  label: "ملاحظات",
                  type: "TEXTAREA",
                  isRequired: false,
                  order: 3,
                },
              ],
            },
          },
        ],
      },
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
      },
    },
  });

  return { service, workflow };
}

export default async function NewFamilySchoolCommunicationPage() {
  const { service, workflow } = await ensureFamilyCommunicationWorkflow();

  const runtimeWorkflow = {
    id: workflow.id,
    name: workflow.name,
    serviceSlug: service.slug,
    workflowType: workflow.workflowType,
    studentPickerMode: workflow.studentPickerMode || "SERVICE_DEFAULT",
    evidenceMode: workflow.evidenceMode || "SERVICE_DEFAULT",
    steps: workflow.steps
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
            options: field.options
              .sort((a, b) => a.order - b.order)
              .map((option) => ({
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
    <DynamicFormRenderer
      workflow={runtimeWorkflow}
      serviceId={service.id}
      requiresStudent
      title="تواصل بين الأسرة والمدرسة"
    />
  );
}
