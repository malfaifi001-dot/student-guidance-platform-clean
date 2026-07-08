import { prisma } from "@/lib/prisma";

import {
  isValidPerformanceElement,
  resolveSpecialReportFields,
} from "@/lib/special-report/catalog";

import {
  SPECIAL_REPORT_SERVICE_SLUG,
  type SpecialReportRuntimeResponse,
} from "@/lib/special-report/types";

type CreateSpecialReportRuntimeInput = {
  performanceElement: string;
  fieldKeys: string[];
  fieldLabelOverrides?: Record<string, string>;
  schoolAccountId?: string | null;
  createdById?: string | null;
};

const SPECIAL_REPORT_RUNTIME_LINK_SOURCE_TYPE = "SPECIAL_REPORT_RUNTIME_WORKFLOW";
const SPECIAL_REPORT_RUNTIME_LINK_TARGET_TYPE = "WORKFLOW_OWNER_SCHOOL";

export async function ensureSpecialReportService() {
  return prisma.service.upsert({
    where: {
      slug: SPECIAL_REPORT_SERVICE_SLUG,
    },

    update: {
      name: "التقرير الخاص",
      description:
        "خدمة مرنة لبناء تقرير خاص حسب عنصر الأداء والحقول المختارة.",
    },

    create: {
      slug: SPECIAL_REPORT_SERVICE_SLUG,
      name: "التقرير الخاص",
      description:
        "خدمة مرنة لبناء تقرير خاص حسب عنصر الأداء والحقول المختارة.",
    },
  });
}

export async function createSpecialReportRuntime(
  input: CreateSpecialReportRuntimeInput
): Promise<SpecialReportRuntimeResponse> {
  const performanceElement = input.performanceElement.trim();
  const fieldLabelOverrides = Object.fromEntries(
    Object.entries(input.fieldLabelOverrides ?? {}).map(
      ([key, value]) => [key, String(value ?? "").trim()]
    )
  );

  if (!isValidPerformanceElement(performanceElement)) {
    throw new Error("عنصر الأداء غير صالح.");
  }

  const selectedFields = resolveSpecialReportFields(
    input.fieldKeys
  );

  if (selectedFields.length < 2) {
    throw new Error("لم يتم اختيار حقول صالحة للتقرير.");
  }

  const service = await ensureSpecialReportService();

  const latestWorkflow = await prisma.workflow.findFirst({
    where: {
      serviceId: service.id,
    },

    orderBy: {
      version: "desc",
    },

    select: {
      version: true,
    },
  });

  const nextVersion = (latestWorkflow?.version ?? 0) + 1;

  const workflow = await prisma.$transaction(
    async (tx) => {
      const createdWorkflow = await tx.workflow.create({
        data: {
          serviceId: service.id,

          name: `تقرير خاص | ${performanceElement}`,

          version: nextVersion,
          workflowType: "special-report-runtime",

          /*
           * Runtime خاص بهذا التقرير.
           * لا نجعله Workflow منشورًا عامًا للخدمة.
           */
          isActive: false,
        },
      });

      const reportStep = await tx.workflowStep.create({
        data: {
          workflowId: createdWorkflow.id,

          title: "بيانات التقرير",

          description:
            "الحقول المختارة لبناء التقرير الخاص.",

          order: 1,
        },
      });

      for (
        let index = 0;
        index < selectedFields.length;
        index += 1
      ) {
        const fieldDefinition = selectedFields[index];

        const createdField =
          await tx.dynamicField.create({
            data: {
              stepId: reportStep.id,

              key: fieldDefinition.key,

              label:
                fieldLabelOverrides[fieldDefinition.key] ||
                fieldDefinition.label,

              type: fieldDefinition.type as never,

              placeholder:
                fieldDefinition.placeholder ?? null,

              helpText:
                fieldDefinition.helpText ?? null,

              isRequired:
                fieldDefinition.isRequired,

              order: index + 1,

              dependsOnFieldKey: null,

              linkedToValue: null,

              allowOther:
                fieldDefinition.allowOther ?? false,

              isRepeater:
                fieldDefinition.isRepeater ?? false,
            },
          });

        if (fieldDefinition.options?.length) {
          await tx.dynamicFieldOption.createMany({
            data: fieldDefinition.options.map(
              (option) => ({
                fieldId: createdField.id,

                label: option.label,

                value: option.value,

                order: option.order,

                linkedToValue: null,
              })
            ),
          });
        }
      }

      /*
       * الشواهد مستقلة عن بنك الحقول.
       * DynamicFormRenderer الحالي يكتشف خطوة الشواهد
       * من اسم الخطوة.
       */
      await tx.workflowStep.create({
        data: {
          workflowId: createdWorkflow.id,

          title: "الشواهد والمرفقات",

          description:
            "أضف الشواهد المرتبطة بالتقرير الرسمي.",

          order: 2,
        },
      });

      if (input.schoolAccountId) {
        await tx.dashboardResourceLink.create({
          data: {
            schoolAccountId: input.schoolAccountId,
            sourceType: SPECIAL_REPORT_RUNTIME_LINK_SOURCE_TYPE,
            sourceId: createdWorkflow.id,
            targetType: SPECIAL_REPORT_RUNTIME_LINK_TARGET_TYPE,
            targetId: input.schoolAccountId,
            createdById: input.createdById ?? null,
          },
        });
      }

      return createdWorkflow;
    }
  );

  const hydratedWorkflow =
    await prisma.workflow.findUniqueOrThrow({
      where: {
        id: workflow.id,
      },

      include: {
        steps: {
          orderBy: {
            order: "asc",
          },

          include: {
            fields: {
              orderBy: {
                order: "asc",
              },

              include: {
                options: {
                  orderBy: {
                    order: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

  return {
    serviceId: service.id,

    workflow: {
      id: hydratedWorkflow.id,

      name: hydratedWorkflow.name,

      serviceSlug: SPECIAL_REPORT_SERVICE_SLUG,

      steps: hydratedWorkflow.steps.map((step) => ({
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

          dependsOnFieldKey:
            field.dependsOnFieldKey,

          linkedToValue:
            field.linkedToValue,

          allowOther:
            field.allowOther,

          isRepeater:
            field.isRepeater,

          options: field.options.map((option) => ({
            id: option.id,

            label: option.label,

            value: option.value,

            order: option.order,

            linkedToValue:
              option.linkedToValue,
          })),
        })),
      })),
    },
  };
}
