import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

const ROLES = ["ADMIN", "COUNSELOR", "SCHOOL_OWNER", "STAFF"];
const GENDERS = ["MALE", "FEMALE"];

function extractUser(sessionResult: unknown) {
  const value = sessionResult as any;
  return value?.user ?? value?.session?.user ?? value;
}

async function requireAdmin() {
  const sessionResult = await getCurrentSessionUser();
  const user = extractUser(sessionResult);
  if (!user || user.role !== "ADMIN") return null;
  return user;
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

  if (!ROLES.includes(role)) {
    return NextResponse.json({ success: false, error: "الدور غير صحيح." }, { status: 400 });
  }

  if (!GENDERS.includes(gender)) {
    return NextResponse.json({ success: false, error: "الجنس غير صحيح." }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        name,
        phone: body.phone ? String(body.phone).trim() : null,
        officialName: body.officialName ? String(body.officialName).trim() : null,
        jobTitle: body.jobTitle ? String(body.jobTitle).trim() : null,
        role: role as any,
        gender: gender as any,
        isActive: Boolean(body.isActive),
        onboardingCompleted: Boolean(body.onboardingCompleted),
      },
    });

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
