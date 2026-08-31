import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActivityProgramDomainBySlug } from "@/lib/activity-programs/activity-program-catalog";
import { getRuntimeWorkflowByServiceSlug, sortRuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function isExpired(date?: Date | null) {
  return Boolean(date && date.getTime() < Date.now());
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

  const link = await prisma.teacherActivityLink.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      status: true,
      tokenExpiresAt: true,
    },
  });

  if (!link || link.status === "CLOSED" || link.status === "EXPIRED") {
    return NextResponse.json(
      { success: false, error: "الرابط غير صالح." },
      { status: 404 },
    );
  }

  if (isExpired(link.tokenExpiresAt)) {
    await prisma.teacherActivityLink.update({
      where: { id: link.id },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json(
      { success: false, error: "انتهت صلاحية الرابط." },
      { status: 410 },
    );
  }

  const body = await request.json().catch(() => null);
  const domainSlug = String(body?.domainSlug || "").trim();

  const domain = getActivityProgramDomainBySlug(domainSlug);

  if (!domain) {
    return NextResponse.json(
      { success: false, error: "مجال النشاط غير صالح." },
      { status: 400 },
    );
  }

  const publishedWorkflow = await getRuntimeWorkflowByServiceSlug(domain.serviceSlug);

  if (!publishedWorkflow) {
    return NextResponse.json(
      { success: false, error: "لم يتم نشر نموذج لهذا المجال بعد." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    domain: {
      slug: domain.slug,
      title: domain.title,
      serviceSlug: domain.serviceSlug,
    },
    serviceId: publishedWorkflow.service.id,
    workflow: JSON.parse(
      JSON.stringify(sortRuntimeWorkflow(publishedWorkflow.workflow)),
    ),
  });
}
