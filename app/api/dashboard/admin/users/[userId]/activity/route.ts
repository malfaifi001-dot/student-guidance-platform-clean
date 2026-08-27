import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { auditActionLabel } from "@/lib/audit/audit-events";
import { sanitizeAuditMetadata } from "@/lib/audit/audit-service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const { userId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(50, Math.max(10, Number(searchParams.get("pageSize") || "25") || 25));
  const category = searchParams.get("category")?.trim();
  const action = searchParams.get("action")?.trim();
  const severity = searchParams.get("severity")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const createdAt = {
    ...(from && !Number.isNaN(Date.parse(from)) ? { gte: new Date(from) } : {}),
    ...(to && !Number.isNaN(Date.parse(to)) ? { lte: new Date(to) } : {}),
  };

  const where = {
    OR: [{ actorUserId: userId }, { targetUserId: userId }],
    ...(category ? { category } : {}),
    ...(action ? { action } : {}),
    ...(severity ? { severity } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.platformActivityLog.count({ where }),
    prisma.platformActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        actorUserId: true,
        targetUserId: true,
        schoolAccountId: true,
        category: true,
        action: true,
        severity: true,
        title: true,
        details: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    userId,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    logs: logs.map((log) => ({
      ...log,
      label: auditActionLabel(log.action, log.title),
      details: sanitizeAuditMetadata(log.details as Record<string, unknown>),
    })),
  });
}
