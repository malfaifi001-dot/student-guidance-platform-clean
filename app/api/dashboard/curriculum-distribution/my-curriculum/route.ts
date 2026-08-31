import { NextResponse } from "next/server";
import { requireServiceAccessForCurrentUser } from "@/bin/require-auth";
import { listTeacherSavedCurriculum, removeTeacherCurriculum, saveTeacherCurriculum } from "@/lib/curriculum-distribution/my-curriculum";
import { listServiceOutputLinks } from "@/lib/service-output-links/service-output-links";

const SERVICE = "curriculum-distribution";

async function authorize() {
  const context = await requireServiceAccessForCurrentUser(SERVICE);
  if (context instanceof Response) return context;
  if (!context.isAdmin && context.user.role !== "TEACHER") return NextResponse.json({ error: "هذه الخدمة متاحة للمعلمين فقط." }, { status: 403 });
  if (!context.user.schoolAccountId) return NextResponse.json({ error: "حساب المدرسة غير مكتمل." }, { status: 400 });
  return context;
}

function enrich(saved: Awaited<ReturnType<typeof listTeacherSavedCurriculum>>, links: Awaited<ReturnType<typeof listServiceOutputLinks>>) {
  return saved.map((item) => {
    const distribution = item.distribution!;
    const link = links.find((candidate) => {
      const ref = candidate.sourceReferenceJson;
      return ref && typeof ref === "object" && !Array.isArray(ref) && (ref as Record<string, unknown>).subjectId === item.subjectId && (ref as Record<string, unknown>).semesterId === item.semesterId;
    });
    return { id: item.id, subjectId: item.subjectId, semesterId: item.semesterId, createdAt: item.createdAt, subject: distribution.subject, stage: distribution.stage, grade: distribution.grade, semester: distribution.semester, portfolioLink: link || null };
  });
}

export async function GET() {
  const context = await authorize();
  if (context instanceof Response) return context;
  const saved = await listTeacherSavedCurriculum(context.user.id, context.schoolAccountId, { historicalPersonalRead: true });
  const links = await listServiceOutputLinks({ ownerUserId: context.user.id, serviceSlug: SERVICE });
  return NextResponse.json({ items: enrich(saved, links) });
}

export async function POST(request: Request) {
  const context = await authorize();
  if (context instanceof Response) return context;
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "بيانات الحفظ غير صالحة." }, { status: 400 }); }
  const subjectId = String(body.subjectId || "").trim();
  const semesterId = String(body.semesterId || "").trim();
  if (!subjectId || !semesterId) return NextResponse.json({ error: "المادة والفصل الدراسي مطلوبان." }, { status: 400 });
  const result = await saveTeacherCurriculum({ ownerUserId: context.user.id, schoolAccountId: context.schoolAccountId, subjectId, semesterId });
  if (!result.ok) return NextResponse.json({ error: "توزيع المنهج غير موجود." }, { status: 404 });
  return NextResponse.json({ ok: true, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
}

export async function DELETE(request: Request) {
  const context = await authorize();
  if (context instanceof Response) return context;
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* query fallback */ }
  const id = String(body.id || new URL(request.url).searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "المادة المطلوبة غير محددة." }, { status: 400 });
  const removed = await removeTeacherCurriculum({ ownerUserId: context.user.id, id });
  return removed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "المادة غير موجودة." }, { status: 404 });
}
