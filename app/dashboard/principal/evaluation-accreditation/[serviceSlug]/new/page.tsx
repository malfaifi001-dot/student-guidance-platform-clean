import Link from "next/link";
import { notFound } from "next/navigation";

import { PrincipalWorkflowEntryForm } from "@/components/principal/principal-workflow-entry-form";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { getPrincipalEvaluationAccreditationService } from "@/lib/principal/evaluation-accreditation-services";
import { requirePrincipalServicePageAccess } from "@/lib/principal/performance-service";

type PageProps = { params: Promise<{ serviceSlug: string }> };

export const dynamic = "force-dynamic";

export default async function NewEvaluationAccreditationEntryPage({
  params,
}: PageProps) {
  const { serviceSlug } = await params;
  const service = getPrincipalEvaluationAccreditationService(serviceSlug);
  if (!service) notFound();

  const access = await requirePrincipalServicePageAccess(service);
  const published = await getRuntimeWorkflowByServiceSlug(service.serviceSlug);

  if (!published) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs font-black text-amber-700 dark:text-amber-300">{service.title}</p>
          <h1 className="mt-3 text-2xl font-black text-amber-950 dark:text-amber-100">لا يوجد Workflow منشور</h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-amber-800 dark:text-amber-200">ارفع Workflow لهذه الخدمة من لوحة الأدمن، ثم انشره حتى يظهر نموذج الإنشاء لمدير المدرسة.</p>
          <Link href={service.href} className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-200 dark:bg-slate-950 dark:text-amber-200 dark:ring-amber-900">العودة إلى الخدمة</Link>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="space-y-6">
      <PrincipalWorkflowEntryForm
        itemSlug={service.slug}
        itemTitle={service.title}
        itemHref={service.href}
        serviceId={access.service.id}
        workflow={published.workflow}
        saveEndpoint={`/api/dashboard/principal/evaluation-accreditation/${encodeURIComponent(service.slug)}/entries`}
      />
    </main>
  );
}
