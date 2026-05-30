import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";

export default async function NewStudentGuidanceServicePage() {
  const runtime = await getRuntimeWorkflowByServiceSlug(
    "student-guidance-services"
  );

  if (!runtime) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-amber-900">
            لا يوجد Workflow منشور
          </h1>

          <p className="mt-3 text-sm leading-7 text-amber-700">
            قم برفع Workflow لخدمة الخدمات التوجيهية المقدمة للطلاب من لوحة
            الأدمن أولًا، ثم اعتمده حتى يظهر للموجه/الموجهة.
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
        requiresStudent={true}
        title="الخدمات التوجيهية المقدمة للطلاب"
      />
    </main>
  );
}