import { NextResponse } from "next/server";

import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { PRINCIPAL_PERFORMANCE_ITEMS } from "@/lib/principal/performance-items";
import { PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES } from "@/lib/principal/evaluation-accreditation-services";
import { prisma } from "@/lib/prisma";

const allowedTargetIds = new Set([
  ...PRINCIPAL_PERFORMANCE_ITEMS.map((item) => item.serviceSlug),
  ...PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES.map((item) => item.serviceSlug),
]);

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const access = await requirePrincipalApi();
  if (!access.ok) return access.response;
  const schoolAccountId = access.schoolAccountId;
  if (!schoolAccountId) return NextResponse.json({ success: false, error: "المدرسة غير مرتبطة." }, { status: 403 });

  const { userId } = await params;
  const body = (await request.json().catch(() => null)) as {
    sourceType?: string;
    sourceId?: string;
    targetIds?: unknown;
  } | null;
  const requestedSourceType = body?.sourceType;
  const sourceType = requestedSourceType === "REPORT_TWO" ? "REPORT_SNAPSHOT" : requestedSourceType;
  const sourceId = String(body?.sourceId || "").trim();
  const targetIds = Array.isArray(body?.targetIds)
    ? Array.from(new Set(body.targetIds.map((value) => String(value).trim()).filter(Boolean)))
    : [];

  if (!sourceId || !["GUIDANCE_REPORT", "REPORT_SNAPSHOT"].includes(sourceType || "") || !targetIds.length || targetIds.some((id) => !allowedTargetIds.has(id))) {
    return NextResponse.json({ success: false, error: "بيانات الربط غير مكتملة." }, { status: 400 });
  }

  const staff = await prisma.user.findFirst({
    where: { id: userId, schoolAccountId, role: { in: ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER"] } },
    select: { id: true },
  });
  if (!staff) return NextResponse.json({ success: false, error: "المنسوب غير متاح." }, { status: 404 });

  const staffCaseIds = (await prisma.caseEntry.findMany({
    where: { schoolAccountId, createdById: staff.id },
    select: { id: true },
  })).map((item) => item.id);

  const caseEntry = sourceType === "GUIDANCE_REPORT"
    ? await prisma.guidanceReport.findFirst({
        where: { id: sourceId, status: { in: ["GENERATED", "APPROVED", "ARCHIVED"] }, caseEntry: { schoolAccountId, createdById: staff.id } },
        select: { id: true },
      })
    : requestedSourceType === "REPORT_TWO"
      ? await prisma.reportTwoActive.findFirst({
          where: { id: sourceId, schoolAccountId, status: "APPROVED", caseEntryId: { in: staffCaseIds } },
          select: { id: true },
        })
      : await prisma.reportSnapshot.findFirst({
          where: { id: sourceId, OR: [{ schoolAccountId }, { schoolAccountId: null }], caseEntryId: { in: staffCaseIds } },
          select: { id: true },
        });

  if (!caseEntry) return NextResponse.json({ success: false, error: "التقرير غير متاح للربط." }, { status: 404 });

  const persistedSourceType = sourceType as "GUIDANCE_REPORT" | "REPORT_SNAPSHOT";
  await prisma.$transaction(
    targetIds.map((targetId) => prisma.dashboardResourceLink.upsert({
      where: {
        schoolAccountId_sourceType_sourceId_targetType_targetId: {
          schoolAccountId,
          sourceType: persistedSourceType,
          sourceId,
          targetType: "PRINCIPAL_SERVICE",
          targetId,
        },
      },
      create: {
        schoolAccountId,
        sourceType: persistedSourceType,
        sourceId,
        targetType: "PRINCIPAL_SERVICE",
        targetId,
        createdById: access.user.id,
      },
      update: {},
    })),
  );

  return NextResponse.json({ success: true, targetIds });
}
