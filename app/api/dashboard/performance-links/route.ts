import { NextResponse } from "next/server";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getAllowedPerformanceItems } from "@/lib/performance-items/role-performance-items";
import { createServiceOutputLink, listServiceOutputLinks, parseLinkRole } from "@/lib/service-output-links/service-output-links";
import { getDistribution } from "@/lib/curriculum-distribution/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) { return String(value ?? "").trim(); }

async function authForService(serviceSlug: string) {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const access = await requireServiceAccessApi(serviceSlug, { allowPrincipal: true });
  return access ? access : auth;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const serviceSlug = clean(url.searchParams.get("serviceSlug"));
  const requestedRole = clean(url.searchParams.get("roleContext"));
  if (!serviceSlug) return NextResponse.json({ error: "الخدمة مطلوبة." }, { status: 400 });
  const auth = await authForService(serviceSlug);
  if (auth instanceof Response) return auth;
  const roleKey = auth.user.role === "ADMIN" ? parseLinkRole(requestedRole) : parseLinkRole(auth.user.role);
  if (!roleKey) return NextResponse.json({ error: "الدور غير مدعوم." }, { status: 403 });
  const links = await listServiceOutputLinks({ ownerUserId: auth.user.id, schoolAccountId: auth.schoolAccountId, roleKey, serviceSlug, performanceItemKey: clean(url.searchParams.get("performanceItemKey")) || undefined });
  const enrichedLinks = serviceSlug === "curriculum-distribution"
    ? await Promise.all(links.map(async (link) => {
      const reference = link.sourceReferenceJson && typeof link.sourceReferenceJson === "object" && !Array.isArray(link.sourceReferenceJson) ? link.sourceReferenceJson as Record<string, unknown> : {};
      const subjectId = clean(reference.subjectId);
      const semesterId = clean(reference.semesterId);
      const distribution = subjectId && semesterId ? await getDistribution(subjectId, semesterId) : null;
      return { ...link, sourceSummary: distribution ? { subjectName: distribution.subject.name, stageName: distribution.stage.name, gradeName: distribution.grade.name, semesterName: distribution.semester.name } : null };
    }))
    : links;
  return NextResponse.json({ performanceItems: getAllowedPerformanceItems(roleKey), links: enrichedLinks });
}

export async function POST(request: Request) {
  let body: any = {};
  try { body = await request.json(); } catch { /* invalid JSON handled below */ }
  const serviceSlug = clean(body.serviceSlug);
  const auth = await authForService(serviceSlug);
  if (auth instanceof Response) return auth;
  const roleKey = auth.user.role === "ADMIN" ? parseLinkRole(body.roleContext) : parseLinkRole(auth.user.role);
  const performanceItemKey = clean(body.performanceItemKey);
  const resourceType = clean(body.resourceType);
  const sourceReference = body.sourceReference && typeof body.sourceReference === "object" && !Array.isArray(body.sourceReference) ? body.sourceReference : null;
  if (!roleKey || !serviceSlug || !performanceItemKey || !resourceType || !sourceReference) return NextResponse.json({ error: "بيانات الربط غير مكتملة." }, { status: 400 });
  const subjectId = clean(sourceReference.subjectId);
  const semesterId = clean(sourceReference.semesterId);
  if (serviceSlug === "curriculum-distribution") {
    if (!subjectId || !semesterId || !await getDistribution(subjectId, semesterId)) return NextResponse.json({ error: "توزيع المنهج غير موجود." }, { status: 404 });
  }
  const item = getAllowedPerformanceItems(roleKey).find((candidate) => candidate.key === performanceItemKey);
  if (!item) return NextResponse.json({ error: "عنصر الأداء غير متاح لهذا الدور." }, { status: 403 });
  const sourceKey = clean(body.sourceKey) || [subjectId, semesterId].filter(Boolean).join(":");
  if (!sourceKey) return NextResponse.json({ error: "مرجع المصدر مطلوب." }, { status: 400 });
  try {
    const link = await createServiceOutputLink({ ownerUserId: auth.user.id, schoolAccountId: auth.schoolAccountId, roleKey, serviceSlug, performanceItemKey, resourceType, sourceKey, sourceReference, displayTitle: clean(body.displayTitle) || item.title, metadata: body.metadata });
    return NextResponse.json({ ok: true, link }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "هذا المصدر مرتبط بعنصر الأداء نفسه مسبقًا." }, { status: 409 });
    console.error("SERVICE_OUTPUT_LINK_CREATE_ERROR", error);
    return NextResponse.json({ error: "تعذر حفظ الربط." }, { status: 500 });
  }
}
