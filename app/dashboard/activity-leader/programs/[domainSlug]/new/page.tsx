import Link from "next/link";
import { notFound } from "next/navigation";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { getActivityProgramDomainBySlug } from "@/lib/activity-programs/activity-program-catalog";

type PageProps = {
  params: Promise<{
    domainSlug: string;
  }>;
};

export default async function NewActivityProgramDomainCasePage({
  params,
}: PageProps) {
  const { domainSlug } = await params;
  const domain = getActivityProgramDomainBySlug(domainSlug);

  if (!domain) {
    notFound();
  }

  const publishedWorkflow = await getRuntimeWorkflowByServiceSlug(
    domain.serviceSlug,
  );

  if (!publishedWorkflow) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-xs font-black text-amber-700">برامج النشاط</p>

          <h1 className="mt-3 text-2xl font-black text-amber-950">
            لا يوجد Workflow منشور لمجال {domain.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-amber-800">
            ارفع Workflow لهذا المجال من لوحة الأدمن، ثم ارجع لإنشاء البطاقة.
          </p>

          <div className="mt-6">
            <Link
              href={`/dashboard/activity-leader/programs/${domain.slug}`}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-200"
            >
              العودة للمجال
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <DynamicFormRenderer
        workflow={publishedWorkflow.workflow}
        serviceId={publishedWorkflow.service.id}
        requiresStudent={false}
        initialValues={{
          activity_domain: domain.title,
        }}
        title={`تنفيذ برنامج نشاط - ${domain.title}`}
      />
    </main>
  );
}
