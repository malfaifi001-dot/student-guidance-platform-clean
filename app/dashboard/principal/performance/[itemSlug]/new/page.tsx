import { notFound } from "next/navigation";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { getPrincipalPerformanceItem } from "@/lib/principal/performance-items";
import { requirePrincipalPerformancePageAccess } from "@/lib/principal/performance-service";

type PageProps = { params: Promise<{ itemSlug: string }> };

export const dynamic = "force-dynamic";

export default async function NewPrincipalPerformanceEntryPage({ params }: PageProps) {
  const { itemSlug } = await params;
  const item = getPrincipalPerformanceItem(itemSlug);
  if (!item) notFound();

  const access = await requirePrincipalPerformancePageAccess(item);
  const runtime = await getRuntimeWorkflowByServiceSlug(item.serviceSlug);

  if (!runtime) {
    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm font-black text-amber-700">{item.title}</p>
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
        title={item.title}
      />
    </main>
  );
}
