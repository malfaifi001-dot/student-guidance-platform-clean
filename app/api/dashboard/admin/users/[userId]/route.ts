import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { Gender, UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["ADMIN", "COUNSELOR", "ACTIVITY_LEADER", "TEACHER", "PRINCIPAL", "SCHOOL_OWNER", "STAFF"];
const GENDERS: Gender[] = ["MALE", "FEMALE"];

async function requireAdmin() {
  const error = await requireAdminApi();
  if (error) return null;
  const sessionResult = await getCurrentSessionUser();
  return sessionResult?.user || null;
}

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ success: false, error: "غير مصرح." }, { status: 403 });
  }

  const { userId } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { schoolAccount: true },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "المستخدم غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ success: true, user: JSON.parse(JSON.stringify(user)) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ success: false, error: "غير مصرح." }, { status: 403 });
  }

  const { userId } = await context.params;
  const body = await request.json();

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const role = String(body.role || "COUNSELOR");
  const gender = String(body.gender || "MALE");

  if (!email || !name) {
    return NextResponse.json(
      { success: false, error: "الاسم والبريد الإلكتروني مطلوبة." },
      { status: 400 }
    );
  }

  if (!ROLES.includes(role as UserRole)) {
    return NextResponse.json({ success: false, error: "الدور غير صحيح." }, { status: 400 });
  }

  if (!GENDERS.includes(gender as Gender)) {
    return NextResponse.json({ success: false, error: "الجنس غير صحيح." }, { status: 400 });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, schoolAccountId: true } });
    if (!target) return NextResponse.json({ success: false, error: "المستخدم غير موجود." }, { status: 404 });
    if (role === "PRINCIPAL" && target.role !== "PRINCIPAL") {
      return NextResponse.json({ success: false, error: "يتم إنشاء حساب مدير المدرسة من صفحة التسجيل العامة." }, { status: 403 });
    }

    const schoolAccountId = target.schoolAccountId;

    if (role === "PRINCIPAL") {
      if (!schoolAccountId) return NextResponse.json({ success: false, error: "يجب ربط مدير المدرسة بمدرسة قائمة." }, { status: 400 });
      const [school, existingPrincipal] = await Promise.all([
        prisma.schoolAccount.findFirst({ where: { id: schoolAccountId, isActive: true }, select: { id: true } }),
        prisma.user.findFirst({ where: { schoolAccountId, role: "PRINCIPAL", isActive: true, id: { not: userId } }, select: { id: true } }),
      ]);
      if (!school) return NextResponse.json({ success: false, error: "المدرسة المحددة غير موجودة أو غير نشطة." }, { status: 400 });
      if (existingPrincipal && Boolean(body.isActive)) return NextResponse.json({ success: false, error: "يوجد مدير مدرسة نشط مرتبط بهذه المدرسة بالفعل." }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        name,
        phone: body.phone ? String(body.phone).trim() : null,
        officialName: body.officialName ? String(body.officialName).trim() : null,
        jobTitle: body.jobTitle ? String(body.jobTitle).trim() : null,
        role: role as UserRole,
        gender: gender as Gender,
        schoolAccountId,
        isActive: Boolean(body.isActive),
        onboardingCompleted: Boolean(body.onboardingCompleted),
      },
    });

    if (role === "PRINCIPAL" || target.role === "PRINCIPAL") {
      await logAdminActivity({
        actorUserId: admin.id,
        targetUserId: userId,
        schoolAccountId,
        category: "USER",
        action: "principal-account-updated",
        severity: "INFO",
        title: `تم تحديث حساب مدير المدرسة ${email}`,
        details: { previousRole: target.role, nextRole: role },
      });
    }

    return NextResponse.json({
      success: true,
      user: JSON.parse(JSON.stringify(updated)),
    });
  } catch (error) {
    console.error("ADMIN_UPDATE_USER_ERROR", error);

    return NextResponse.json(
      { success: false, error: "تعذر حفظ بيانات المستخدم. تأكد أن البريد غير مستخدم." },
      { status: 500 }
    );
  }
}
