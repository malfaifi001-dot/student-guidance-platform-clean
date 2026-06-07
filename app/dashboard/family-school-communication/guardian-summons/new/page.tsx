import Link from "next/link";
import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";

export default async function NewGuardianSummonsPage() {
  const result = await getRuntimeWorkflowByServiceSlug(
    "family-school-communication",
    "guardian-summons",
  );

  if (!result) {
    return (
      <main dir="rtl" className="space-y-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
        <div>
          <p className="text-sm font-black text-amber-700">Workflow غير منشور</p>
          <h1 className="mt-2 text-3xl font-black text-amber-950">
            لم يتم نشر نموذج استدعاء ولي أمر بعد
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-amber-800">
            يجب على الأدمن إنشاء/نشر Workflow استدعاء ولي أمر من صفحة إدارة Workflows قبل استخدامه من الموجه/الموجهة.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/workflows"
            className="rounded-2xl bg-amber-700 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-800"
          >
            الذهاب لإدارة Workflows
          </Link>

          <Link
            href="/dashboard/family-school-communication"
            className="rounded-2xl border border-amber-300 px-5 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100"
          >
            رجوع للتواصل مع الأسرة
          </Link>
        </div>
      </main>
    );
  }

  return (
    <DynamicFormRenderer
      workflow={result.workflow}
      serviceId={result.service.id}
      requiresStudent
      title="استدعاء ولي أمر"
    />
  );
}
