import { notFound } from "next/navigation";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { getPrincipalEvaluationAccreditationService } from "@/lib/principal/evaluation-accreditation-services";
import { requirePrincipalServicePageAccess } from "@/lib/principal/performance-service";

type PageProps = { params: Promise<{ serviceSlug: string }> };

export const dynamic = "force-dynamic";

export default async function NewEvaluationAccreditationEntryPage({ params }: PageProps) {
  const { serviceSlug } = await params;
  const service = getPrincipalEvaluationAccreditationService(serviceSlug);
  if (!service) notFound();

  const access = await requirePrincipalServicePageAccess(service);
  const runtime = await getRuntimeWorkflowByServiceSlug(service.serviceSlug);

  if (!runtime) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm font-black text-amber-700">{service.title}</p>
          <h1 className="mt-2 text-2xl font-black text-amber-900">لا يوجد Workflow منشور</h1>
          <p className="mt-3 text-sm leading-7 text-amber-700">ارفع Workflow لهذه الخدمة وانشره أولًا.</p>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="space-y-6">
      <DynamicFormRenderer
        workflow={runtime.workflow}
        serviceId={access.service.id}
        requiresStudent={false}
        title={service.title}
      />
    </main>
  );
}
