import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { prisma } from "@/lib/prisma";

async function ensureRuntimeLabServiceAndWorkflow() {
  const service = await prisma.service.upsert({
    where: {
      slug: "runtime-lab",
    },
    update: {},
    create: {
      slug: "runtime-lab",
      name: "مختبر Runtime",
      description: "خدمة تجريبية لاختبار المحرك الديناميكي.",
      status: "ACTIVE",
    },
  });

  const existingWorkflow = await prisma.workflow.findFirst({
    where: {
      serviceId: service.id,
      isActive: true,
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

  if (existingWorkflow) {
    return {
      service,
      workflow: existingWorkflow,
    };
  }

  const workflow = await prisma.workflow.create({
    data: {
      serviceId: service.id,
      name: "نموذج تجربة المحرك الديناميكي",
      version: 1,
      status: "ACTIVE",
      isActive: true,
      steps: {
        create: [
          {
            title: "بيانات الحالة",
            description: "اختبر الحقول الأساسية والتبعيات.",
            order: 1,
            fields: {
              create: [
                {
                  key: "case_type",
                  label: "نوع الحالة",
                  type: "SELECT",
                  isRequired: true,
                  order: 1,
                  allowOther: true,
                  options: {
                    create: [
                      { label: "سلوكية", value: "behavioral", order: 1 },
                      { label: "أكاديمية", value: "academic", order: 2 },
                      { label: "نفسية", value: "psychological", order: 3 },
                    ],
                  },
                },
                {
                  key: "academic_level",
                  label: "التصنيف الأكاديمي",
                  type: "SELECT",
                  isRequired: false,
                  order: 2,
                  dependsOnFieldKey: "case_type",
                  linkedToValue: "academic",
                  options: {
                    create: [
                      { label: "ضعف تحصيلي", value: "low_achievement", order: 1 },
                      { label: "تأخر دراسي", value: "late_learning", order: 2 },
                    ],
                  },
                },
                {
                  key: "problem_description",
                  label: "وصف المشكلة",
                  type: "TEXTAREA",
                  isRequired: true,
                  order: 3,
                  placeholder: "اكتب وصفًا مختصرًا للحالة...",
                },
              ],
            },
          },
          {
            title: "الإجراء والنتيجة",
            description: "اختبر حفظ القيم كمسودة أو إرسال نهائي.",
            order: 2,
            fields: {
              create: [
                {
                  key: "action_taken",
                  label: "الإجراء المتخذ",
                  type: "TEXTAREA",
                  isRequired: true,
                  order: 1,
                },
                {
                  key: "result",
                  label: "النتيجة",
                  type: "SELECT",
                  isRequired: true,
                  order: 2,
                  options: {
                    create: [
                      { label: "تحسن", value: "improved", order: 1 },
                      { label: "يحتاج متابعة", value: "needs_followup", order: 2 },
                      { label: "إحالة", value: "referral", order: 3 },
                    ],
                  },
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

  return {
    service,
    workflow,
  };
}

export default async function RuntimeLabPage() {
  const { service, workflow } = await ensureRuntimeLabServiceAndWorkflow();

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
      title="تجربة حفظ Runtime"
    />
  );
}
