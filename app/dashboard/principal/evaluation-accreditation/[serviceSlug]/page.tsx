import { notFound } from "next/navigation";

import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";
import { getPrincipalEvaluationAccreditationService } from "@/lib/principal/evaluation-accreditation-services";
import { requirePrincipalServicePageAccess } from "@/lib/principal/performance-service";

type PageProps = { params: Promise<{ serviceSlug: string }> };

export const dynamic = "force-dynamic";

export default async function PrincipalEvaluationAccreditationPage({ params }: PageProps) {
  const { serviceSlug } = await params;
  const service = getPrincipalEvaluationAccreditationService(serviceSlug);
  if (!service) notFound();
  await requirePrincipalServicePageAccess(service);

  return (
    <WorkflowServiceHomePage
      serviceSlug={service.serviceSlug}
      basePath={service.href}
      title={service.title}
      description={service.description}
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
