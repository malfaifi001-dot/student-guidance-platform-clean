import { notFound } from "next/navigation";

import { EvaluationAccreditationServicePage } from "@/components/principal/evaluation-accreditation-service-page";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { getPrincipalEvaluationAccreditationService } from "@/lib/principal/evaluation-accreditation-services";
import { getPrincipalServicePageData } from "@/lib/principal/performance-service";

type PageProps = { params: Promise<{ serviceSlug: string }> };

export const dynamic = "force-dynamic";

export default async function PrincipalEvaluationAccreditationPage({
  params,
}: PageProps) {
  const { serviceSlug } = await params;
  const service = getPrincipalEvaluationAccreditationService(serviceSlug);
  if (!service) notFound();

  const data = await getPrincipalServicePageData(service);
  const published = await getRuntimeWorkflowByServiceSlug(service.serviceSlug);
  return (
    <EvaluationAccreditationServicePage
      service={service}
      data={data}
      hasPublishedWorkflow={Boolean(published)}
    />
  );
}
