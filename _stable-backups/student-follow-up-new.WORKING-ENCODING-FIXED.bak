import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { prisma } from "@/lib/prisma";
import { ensureServiceBySlug } from "@/engine/services/service-workspace-engine";
import { getServiceRuntimePolicy } from "@/lib/services/service-runtime-policy";
async function ensureStudentFollowUpWorkflow() {
  const service = await ensureServiceBySlug({
    slug: "student-follow-up",
    name: "متابعة الطلاب",
    description: "متابعة حالات الطلاب Ùˆالطالبات.",
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

  if (existingWorkflow) return { service, workflow: existingWorkflow };

  const workflow = await prisma.workflow.create({
    data: {
      serviceId: service.id,
      name: "نم�ˆذج متابعة الطلاب",
      version: 1,
      status: "ACTIVE",
      isActive: true,
      steps: {
        create: [
          {
            title: "تصني� الحالة",
            description: "اختر ن�ˆع المش�ƒلة Ùˆالتصني� المرتبط بها.",
            order: 1,
            fields: {
              create: [
                {
                  key: "problem_type",
                  label: "ن�ˆع المش�ƒلة",
                  type: "SELECT",
                  isRequired: true,
                  order: 1,
                  allowOther: true,
                  options: {
                    create: [
                      { label: "سل�ˆÙƒية", value: "behavioral", order: 1 },
                      { label: "أ�ƒاديمية", value: "academic", order: 2 },
                      { label: "ن�سية", value: "psychological", order: 3 },
                      { label: "اجتماعية", value: "social", order: 4 },
                    ],
                  },
                },
                {
                  key: "academic_classification",
                  label: "التصني� الأ�ƒاديمي",
                  type: "SELECT",
                  isRequired: false,
                  order: 2,
                  dependsOnFieldKey: "problem_type",
                  linkedToValue: "academic",
                  allowOther: true,
                  options: {
                    create: [
                      { label: "ضع� تحصيلي", value: "low_achievement", order: 1 },
                      { label: "تأخر دراسي", value: "late_learning", order: 2 },
                      { label: "غياب مت�ƒرر", value: "absence", order: 3 },
                    ],
                  },
                },
                {
                  key: "visible_traits",
                  label: "الص�ات الظاهرة",
                  type: "TEXTAREA",
                  isRequired: false,
                  order: 3,
                  placeholder: "ا�ƒتب الص�ات أ�ˆ المؤشرات الظاهرة على الطالب/الطالبة...",
                },
              ],
            },
          },
          {
            title: "الإجراء Ùˆالنتيجة",
            description: "Ùˆث�‘ق الإجراء المتخذ Ùˆالنتيجة.",
            order: 2,
            fields: {
              create: [
                {
                  key: "reasons",
                  label: "الأسباب",
                  type: "TEXTAREA",
                  isRequired: false,
                  order: 1,
                },
                {
                  key: "action_taken",
                  label: "الإجراء المتخذ",
                  type: "TEXTAREA",
                  isRequired: true,
                  order: 2,
                },
                {
                  key: "result",
                  label: "النتيجة",
                  type: "SELECT",
                  isRequired: true,
                  order: 3,
                  allowOther: true,
                  options: {
                    create: [
                      { label: "تحسن", value: "improved", order: 1 },
                      { label: "يحتاج متابعة", value: "needs_followup", order: 2 },
                      { label: "إحالة", value: "referral", order: 3 },
                    ],
                  },
                },
                {
                  key: "notes",
                  label: "ملاحظات",
                  type: "TEXTAREA",
                  isRequired: false,
                  order: 4,
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

export default async function NewStudentFollowUpPage() {
  const { service, workflow } = await ensureStudentFollowUpWorkflow();

  const runtimeWorkflow = {
    id: workflow.id,
    name: workflow.name,
    serviceSlug: service.slug,
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

  const runtimePolicy = getServiceRuntimePolicy(service.slug);
  return (
    <DynamicFormRenderer
      workflow={runtimeWorkflow}
      serviceId={service.id}
      requiresStudent
      title="متابعة طالب/طالبة"
    />
  );
}

