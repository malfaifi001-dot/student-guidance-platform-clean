import { notFound } from "next/navigation";

import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";
import { getPrincipalPerformanceItem } from "@/lib/principal/performance-items";
import { requirePrincipalPerformancePageAccess } from "@/lib/principal/performance-service";

type PageProps = { params: Promise<{ itemSlug: string }> };

export const dynamic = "force-dynamic";

export default async function PrincipalPerformanceItemPage({ params }: PageProps) {
  const { itemSlug } = await params;
  const item = getPrincipalPerformanceItem(itemSlug);
  if (!item) notFound();
  await requirePrincipalPerformancePageAccess(item);

  return (
    <WorkflowServiceHomePage
      serviceSlug={item.serviceSlug}
      basePath={item.href}
      title={item.title}
      description={item.description}
      newButtonLabel="إنشاء تقرير جديد"
      caseSingularName="تقرير"
      casePluralName="تقارير"
      emptyTitle="لا توجد تقارير بعد"
      emptyDescription="ابدأ بإنشاء أول تقرير من نموذج Workflow المنشور."
      allowPrincipal
      ownerScoped
    />
  );
}
