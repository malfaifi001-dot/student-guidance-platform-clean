import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";

function normalizeOptionalString(value: unknown, maxLength: number) {
  const text = String(value || "").trim();

  if (!text) return null;

  return text.slice(0, maxLength);
}

function normalizeGender(value: unknown) {
  return value === "FEMALE" ? "FEMALE" : value === "MALE" ? "MALE" : undefined;
}

async function requireCurrentUser() {
  const current = await getCurrentSessionUser();

  if (!current?.user?.id) {
    return {
      current: null,
      response: NextResponse.json(
        {
          success: false,
          error: "يجب تسجيل الدخول أولًا.",
          code: "UNAUTHENTICATED",
        },
        { status: 401 }
      ),
    };
  }

  return {
    current,
    response: null,
  };
}

function toSafeUser(user: {
  id: string;
  name: string;
  officialName: string | null;
  email: string;
  phone: string | null;
  role: string;
  gender: string | null;
  jobTitle: string | null;
  schoolAccountId: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  onboardingSkippedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    officialName: user.officialName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    gender: user.gender,
    jobTitle: user.jobTitle,
    schoolAccountId: user.schoolAccountId,
    isActive: user.isActive,
    onboardingCompleted: user.onboardingCompleted,
    onboardingSkippedAt: user.onboardingSkippedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET() {
  const { current, response } = await requireCurrentUser();

  if (response) return response;

  const user = await prisma.user.findUnique({
    where: {
      id: current.user.id,
    },
    select: {
      id: true,
      name: true,
      officialName: true,
      email: true,
      phone: true,
      role: true,
      gender: true,
      jobTitle: true,
      schoolAccountId: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingSkippedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      {
        success: false,
        error: "الحساب غير موجود أو غير مفعل.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    user: toSafeUser(user),
  });
}

export async function PATCH(request: Request) {
  return updateAccount(request);
}

export async function PUT(request: Request) {
  return updateAccount(request);
}

async function updateAccount(request: Request) {
  const { current, response } = await requireCurrentUser();

  if (response) return response;

  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        success: false,
        error: "بيانات الحساب غير صحيحة.",
      },
      { status: 400 }
    );
  }

  const name = normalizeOptionalString((payload as any).name, 120);
  const officialName = normalizeOptionalString((payload as any).officialName, 160);
  const phone = normalizeOptionalString((payload as any).phone, 30);
  const jobTitle = normalizeOptionalString((payload as any).jobTitle, 120);
  const gender = normalizeGender((payload as any).gender);

  if (!name || name.length < 3) {
    return NextResponse.json(
      {
        success: false,
        error: "الاسم يجب ألا يقل عن 3 أحرف.",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: {
      id: current.user.id,
    },
    data: {
      name,
      officialName: officialName || name,
      phone,
      jobTitle,
      ...(gender ? { gender } : {}),
    },
    select: {
      id: true,
      name: true,
      officialName: true,
      email: true,
      phone: true,
      role: true,
      gender: true,
      jobTitle: true,
      schoolAccountId: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingSkippedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await logAdminActivity({
    actorUserId: updated.id,
    targetUserId: updated.id,
    schoolAccountId: updated.schoolAccountId || null,
    category: "USER",
    action: "account-profile-updated",
    severity: "INFO",
    title: "تم تحديث بيانات الحساب الشخصي",
    details: {
      changedFields: ["name", "officialName", "phone", "jobTitle", "gender"],
    },
  });

  return NextResponse.json({
    success: true,
    user: toSafeUser(updated),
    message: "تم حفظ بيانات الحساب بنجاح.",
  });
}
