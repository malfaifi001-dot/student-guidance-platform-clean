import { NextResponse } from "next/server";

import { ensureDashboardWorkflowService } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { getPrincipalEvaluationAccreditationService } from "@/lib/principal/evaluation-accreditation-services";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

export async function requirePrincipalEvaluationAccreditationApi(
  serviceSlug: string,
) {
  const serviceDefinition =
    getPrincipalEvaluationAccreditationService(serviceSlug);
  if (!serviceDefinition) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "خدمة التقويم والاعتماد غير موجودة." },
        { status: 404 },
      ),
    };
  }

  const principal = await requirePrincipalApi();
  if (!principal.ok) return principal;

  await ensureDashboardWorkflowService(serviceDefinition.serviceSlug);
  const accessResponse = await requireServiceAccessApi(
    serviceDefinition.serviceSlug,
    { allowPrincipal: true },
  );
  if (accessResponse) {
    return { ok: false as const, response: accessResponse };
  }

  const service = await prisma.service.findUnique({
    where: { slug: serviceDefinition.serviceSlug },
    select: { id: true, slug: true, name: true },
  });
  if (!service) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "تعذر تهيئة خدمة التقويم والاعتماد." },
        { status: 500 },
      ),
    };
  }

  return {
    ok: true as const,
    serviceDefinition,
    service,
    principal,
  };
}
