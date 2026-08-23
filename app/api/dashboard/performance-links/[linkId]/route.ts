import { NextResponse } from "next/server";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getAllowedPerformanceItem } from "@/lib/performance-items/role-performance-items";
import { parseLinkRole } from "@/lib/service-output-links/service-output-links";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const { linkId } = await params;
  const existing = await prisma.serviceOutputLink.findFirst({ where: { id: linkId, ownerUserId: auth.user.id, schoolAccountId: auth.schoolAccountId } });
  if (!existing) return NextResponse.json({ error: "الرابط غير موجود." }, { status: 404 });
  const access = await requireServiceAccessApi(existing.serviceSlug, { allowPrincipal: true });
  if (access) return access;
  let body: any = {};
  try { body = await request.json(); } catch { /* invalid JSON */ }
  const roleKey = auth.user.role === "ADMIN" ? parseLinkRole(body.roleContext) || parseLinkRole(existing.roleKey) : parseLinkRole(auth.user.role);
  const performanceItemKey = String(body.performanceItemKey || "").trim();
  if (!roleKey || !getAllowedPerformanceItem(roleKey, performanceItemKey)) return NextResponse.json({ error: "عنصر الأداء غير متاح لهذا الدور." }, { status: 403 });
  try {
    const link = await prisma.serviceOutputLink.update({ where: { id: existing.id }, data: { roleKey, performanceItemKey } });
    return NextResponse.json({ ok: true, link });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "هذا المصدر مرتبط بعنصر الأداء نفسه مسبقًا." }, { status: 409 });
    return NextResponse.json({ error: "تعذر تحديث الربط." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const { linkId } = await params;
  const existing = await prisma.serviceOutputLink.findFirst({ where: { id: linkId, ownerUserId: auth.user.id, schoolAccountId: auth.schoolAccountId } });
  if (!existing) return NextResponse.json({ error: "الرابط غير موجود." }, { status: 404 });
  const access = await requireServiceAccessApi(existing.serviceSlug, { allowPrincipal: true });
  if (access) return access;
  await prisma.serviceOutputLink.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
