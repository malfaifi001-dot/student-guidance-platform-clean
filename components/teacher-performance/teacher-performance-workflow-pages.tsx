import { notFound } from "next/navigation";

import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";
import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { getTeacherPerformanceService } from "@/lib/teacher-performance/teacher-performance-services";

export function TeacherPerformanceWorkflowHome({
  serviceSlug,
}: {
  serviceSlug: string;
}) {
  const service = getTeacherPerformanceService(serviceSlug);

  if (!service) {
    notFound();
  }

  return (
    <WorkflowServiceHomePage
      serviceSlug={service.slug}
      basePath={service.href}
      title={service.title}
      description={service.description}
      newButtonLabel="إنشاء تقرير جديد"
      caseSingularName="تقرير"
      casePluralName="تقارير"
      emptyTitle="لا توجد تقارير بعد"
      emptyDescription="ابدأ بإنشاء أول تقرير من نموذج Workflow المنشور. بعد الحفظ سيظهر هنا كسجل قابل للمتابعة."
    />
  );
}

export async function NewTeacherPerformanceWorkflow({
  serviceSlug,
}: {
  serviceSlug: string;
}) {
  const service = getTeacherPerformanceService(serviceSlug);

  if (!service) {
    notFound();
  }

  const runtime = await getRuntimeWorkflowByServiceSlug(service.slug);

  if (!runtime) {
    return (
      <main className="space-y-4" dir="rtl">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30 sm:p-5">
          <p className="text-sm font-black text-amber-700">{service.title}</p>

          <h1 className="mt-2 text-xl font-black text-amber-900 dark:text-amber-100">
            لا يوجد Workflow منشور
          </h1>

          <p className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-200">
            قم برفع Workflow لهذه الخدمة من لوحة الأدمن أولًا، ثم انشره حتى يظهر للمعلم.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="space-y-4">
      <DynamicFormRenderer
        workflow={runtime.workflow}
        serviceId={runtime.service.id}
        requiresStudent={false}
        title={service.title}
      />
    </main>
  );
}
