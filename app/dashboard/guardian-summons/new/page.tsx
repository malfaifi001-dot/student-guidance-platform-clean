import Link from "next/link";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";

export default async function NewGuardianSummonsPage() {
  const runtime = await getRuntimeWorkflowByServiceSlug("guardian-summons");

  if (!runtime) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm font-black text-amber-700">
            إشعار ولي الأمر
          </p>

          <h1 className="mt-2 text-3xl font-black text-amber-950">
            لا يوجد Workflow منشور
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-amber-800">
            تم تجهيز الخدمة، لكن لا يوجد نموذج منشور لإشعار ولي الأمر. ارفع
            ملف Excel من مركز Workflows ثم انشره حتى يظهر نموذج الإنشاء.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/guardian-summons"
              className="rounded-2xl border border-amber-200 bg-white px-5 py-3 text-sm font-black text-amber-900 transition hover:bg-amber-100"
            >
              العودة للخدمة
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="space-y-6">
      <DynamicFormRenderer
        workflow={runtime.workflow}
        serviceId={runtime.service.id}
        requiresStudent
        title="إشعار ولي الأمر"
        caseDetailsBasePath="/dashboard/guardian-summons"
      />
    </main>
  );
}
