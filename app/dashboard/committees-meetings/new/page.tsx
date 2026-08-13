import Link from "next/link";
import { redirect } from "next/navigation";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import {
  sortRuntimeWorkflow,
  type RuntimeWorkflow,
} from "@/engine/runtime/runtime-resolver";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

const SERVICE_SLUG = "committees-meetings";

type RuntimeWorkflowWithStudentPickerMode = RuntimeWorkflow & {
  studentPickerMode?: string | null;
  evidenceMode?: string | null;
};

function buildRuntimeWorkflow(
  workflow: any,
  serviceSlug: string,
): RuntimeWorkflowWithStudentPickerMode {
  const runtimeWorkflow = sortRuntimeWorkflow({
    id: workflow.id,
    name: workflow.name,
    serviceSlug,
    workflowType: workflow.workflowType,
    steps: workflow.steps.map((step: any) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field: any) => ({
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
        behaviorConfig: field.behaviorConfig,
        allowOther: field.allowOther,
        isRepeater: Boolean(field.isRepeater),
        options: field.options.map((option: any) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  });

  return {
    ...runtimeWorkflow,
    studentPickerMode: workflow.studentPickerMode || "DISABLED",
    evidenceMode: workflow.evidenceMode || "SERVICE_DEFAULT",
  };
}

export default async function NewCommitteesMeetingPage() {
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const service = await prisma.service.findUnique({
    where: {
      slug: SERVICE_SLUG,
    },
    include: {
      workflows: {
        where: {
          isActive: true,
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
        orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
        take: 1,
      },
    },
  });

  if (!service) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm font-black text-amber-700">اللجان والاجتماعات</p>

          <h1 className="mt-2 text-3xl font-black text-amber-950">
            الخدمة غير مهيأة
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-amber-800">
            لم يتم العثور على خدمة اللجان والاجتماعات في قاعدة البيانات. افتح
            مركز Workflows وارفع ملف Excel الخاص بالخدمة.
          </p>

          {context.isAdmin ? (
            <Link
              href="/dashboard/admin/workflows/committees-meetings"
              className="mt-6 inline-flex rounded-2xl bg-amber-900 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-800"
            >
              فتح رفع Workflow
            </Link>
          ) : null}
        </section>
      </main>
    );
  }

  const workflow = service.workflows[0] || null;

  if (!workflow) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm font-black text-amber-700">اللجان والاجتماعات</p>

          <h1 className="mt-2 text-3xl font-black text-amber-950">
            لا يوجد Workflow منشور
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-amber-800">
            تم تجهيز الصفحة، لكن لا يوجد Workflow مفعل لهذه الخدمة. ارفع ملف
            Excel من لوحة الأدمن ثم انشره ليظهر نموذج إنشاء المحضر.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {context.isAdmin ? (
              <Link
                href="/dashboard/admin/workflows/committees-meetings"
                className="rounded-2xl bg-amber-900 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-800"
              >
                رفع Workflow من الأدمن
              </Link>
            ) : null}

            <Link
              href="/dashboard/committees-meetings"
              className="rounded-2xl border border-amber-200 bg-white px-5 py-3 text-sm font-black text-amber-900 transition hover:bg-amber-100"
            >
              العودة للخدمة
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const runtimeWorkflow = buildRuntimeWorkflow(workflow, service.slug);

  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-sky-700">
              اللجان والاجتماعات
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950">
              إنشاء محضر جديد
            </h1>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              هذا النموذج مبني على Workflow المنشور من لوحة الأدمن، وسيتم حفظه
              كحالة ضمن خدمة اللجان والاجتماعات.
            </p>
          </div>

          <Link
            href="/dashboard/committees-meetings"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            العودة للخدمة
          </Link>
        </div>
      </section>

      <DynamicFormRenderer
        workflow={runtimeWorkflow}
        serviceId={service.id}
        requiresStudent={false}
        title="محضر لجنة/اجتماع جديد"
      />
    </main>
  );
}
