import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";

const TEACHER_REPORT_SERVICE_SLUG = "teacher-report-issuance";

export default async function NewTeacherReportIssuancePage() {
  const runtime = await getRuntimeWorkflowByServiceSlug(TEACHER_REPORT_SERVICE_SLUG);

  if (!runtime) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-900">
            لا يوجد Workflow منشور
          </h1>

          <p className="mt-3 text-sm leading-7 text-amber-700">
            قم برفع Workflow لخدمة إصدار تقرير المعلم من لوحة الأدمن أولًا، ثم
            انشره حتى يظهر للمعلم.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="space-y-6">
      <DynamicFormRenderer
        workflow={runtime.workflow}
        serviceId={runtime.service.id}
        requiresStudent={false}
        title="إصدار تقرير"
      />
    </main>
  );
}
