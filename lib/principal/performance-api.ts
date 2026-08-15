import "server-only";

import { NextResponse } from "next/server";

import { ensureDashboardWorkflowService } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { getPrincipalPerformanceItem } from "@/lib/principal/performance-items";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

export async function requirePrincipalPerformanceApi(itemSlug: string) {
  const performanceItem = getPrincipalPerformanceItem(itemSlug);
  if (!performanceItem) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "عنصر التقييم غير موجود." },
        { status: 404 },
      ),
    };
  }

  const principal = await requirePrincipalApi();
  if (!principal.ok) return principal;

  await ensureDashboardWorkflowService(performanceItem.serviceSlug);
  const accessResponse = await requireServiceAccessApi(
    performanceItem.serviceSlug,
    { allowPrincipal: true },
  );
  if (accessResponse) {
    return { ok: false as const, response: accessResponse };
  }

  const service = await prisma.service.findUnique({
    where: { slug: performanceItem.serviceSlug },
    select: { id: true, slug: true, name: true },
  });
  if (!service) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "تعذر تهيئة خدمة عنصر التقييم." },
        { status: 500 },
      ),
    };
  }

  return {
    ok: true as const,
    performanceItem,
    service,
    principal,
  };
}
