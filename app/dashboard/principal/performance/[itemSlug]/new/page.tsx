import { notFound } from "next/navigation";

import { PrincipalWorkflowEntryForm } from "@/components/principal/principal-workflow-entry-form";
import { SimplePerformanceEntryBuilder } from "@/components/principal/simple-performance-entry-builder";
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
  const published = await getRuntimeWorkflowByServiceSlug(item.serviceSlug);

  if (!published) {
    return <SimplePerformanceEntryBuilder itemSlug={item.slug} itemTitle={item.title} cancelHref={item.href} />;
  }

  return (
    <main dir="rtl" className="space-y-6">
      <PrincipalWorkflowEntryForm
        itemSlug={item.slug}
        itemTitle={item.title}
        itemHref={item.href}
        serviceId={access.service.id}
        workflow={published.workflow}
      />
    </main>
  );
}
