import Link from "next/link";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE } from "@/lib/activity-competitions/activity-competitions-service";

export default async function NewStudentActivityCompetitionPage() {
  const publishedWorkflow = await getRuntimeWorkflowByServiceSlug(
    STUDENT_ACTIVITY_COMPETITIONS_SERVICE.slug,
  );

  if (!publishedWorkflow) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-xs font-black text-amber-700">
            {STUDENT_ACTIVITY_COMPETITIONS_SERVICE.title}
          </p>
          <h1 className="mt-3 text-2xl font-black text-amber-950">
            لا يوجد نموذج منشور لهذه الخدمة
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-amber-800">
            يجب أن ينشر مسؤول النظام نموذج الخدمة قبل إنشاء المسابقات. المسودات
            المحفوظة في الإدارة لا تظهر هنا.
          </p>
          <div className="mt-6">
            <Link
              href={STUDENT_ACTIVITY_COMPETITIONS_SERVICE.href}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-200"
            >
              العودة إلى الخدمة
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6" dir="rtl">
      <DynamicFormRenderer
        workflow={publishedWorkflow.workflow}
        serviceId={publishedWorkflow.service.id}
        requiresStudent={false}
        title={STUDENT_ACTIVITY_COMPETITIONS_SERVICE.title}
      />
    </main>
  );
}
