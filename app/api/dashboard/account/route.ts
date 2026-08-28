import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { isTransitionalPhoneEmail } from "@/lib/auth/login-identifier";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";

function normalizeOptionalString(value: unknown, maxLength: number) {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function normalizeGender(value: unknown) {
  return value === "FEMALE" ? "FEMALE" : value === "MALE" ? "MALE" : undefined;
}

function normalizeStringList(value: unknown, maxItems = 30) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, maxItems);
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
        { status: 401 },
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
  teachingStages: unknown;
  teachingSpecialties: unknown;
  teachingSubjects: unknown;
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
    email: isTransitionalPhoneEmail(user.email) ? "" : user.email,
    phone: user.phone,
    role: user.role,
    gender: user.gender,
    jobTitle: user.jobTitle,
    teachingStages: normalizeStringList(user.teachingStages),
    teachingSpecialties: normalizeStringList(user.teachingSpecialties),
    teachingSubjects: normalizeStringList(user.teachingSubjects),
    schoolAccountId: user.schoolAccountId,
    isActive: user.isActive,
    onboardingCompleted: user.onboardingCompleted,
    onboardingSkippedAt: user.onboardingSkippedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const accountSelect = {
  id: true,
  name: true,
  officialName: true,
  email: true,
  phone: true,
  role: true,
  gender: true,
  jobTitle: true,
  teachingStages: true,
  teachingSpecialties: true,
  teachingSubjects: true,
  schoolAccountId: true,
  isActive: true,
  onboardingCompleted: true,
  onboardingSkippedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  const { current, response } = await requireCurrentUser();

  if (response) return response;

  const user = await prisma.user.findUnique({
    where: {
      id: current.user.id,
    },
    select: accountSelect,
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      {
        success: false,
        error: "الحساب غير موجود أو غير مفعل.",
      },
      { status: 404 },
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

export async function DELETE() {
  const { current, response } = await requireCurrentUser();
  if (response) return response;

  const userId = current.user.id;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
      await tx.userSession.updateMany({
      where: { userId },
      data: { isActive: false, revokedAt: now },
      });
      await tx.pushDevice.updateMany({
        where: { userId: current.user.id },
        data: { enabled: false, revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: current.user.id, usedAt: null },
        data: { usedAt: now },
      });
    await tx.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        name: "Deleted Teachix Account",
        officialName: null,
        email: `deleted-${userId}@deleted.invalid`,
        phone: null,
        passwordHash: null,
        signatureUrl: null,
        signatureSignedAt: null,
        teachingStages: Prisma.JsonNull,
        teachingSpecialties: Prisma.JsonNull,
        teachingSubjects: Prisma.JsonNull,
        onboardingCompleted: false,
        onboardingCompletedAt: null,
      },
    });
  });

  const sessionResponse = NextResponse.json({ success: true, redirectTo: "/login" });
  sessionResponse.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  return sessionResponse;
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
      { status: 400 },
    );
  }

  const record = payload as Record<string, unknown>;

  const name = normalizeOptionalString(record.name, 120);
  const officialName = normalizeOptionalString(record.officialName, 160);
  const phone = normalizeOptionalString(record.phone, 30);
  const jobTitle = normalizeOptionalString(record.jobTitle, 120);
  const gender = normalizeGender(record.gender);

  const teachingStages = normalizeStringList(record.teachingStages, 20);
  const teachingSpecialties = normalizeStringList(record.teachingSpecialties, 20);
  const teachingSubjects = normalizeStringList(record.teachingSubjects, 60);

  if (!name || name.length < 3) {
    return NextResponse.json(
      {
        success: false,
        error: "الاسم يجب ألا يقل عن 3 أحرف.",
      },
      { status: 400 },
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
      teachingStages,
      teachingSpecialties,
      teachingSubjects,
      ...(gender ? { gender } : {}),
    },
    select: accountSelect,
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
      changedFields: [
        "name",
        "officialName",
        "phone",
        "jobTitle",
        "gender",
        "teachingStages",
        "teachingSpecialties",
        "teachingSubjects",
      ],
    },
  });

  return NextResponse.json({
    success: true,
    user: toSafeUser(updated),
    message: "تم حفظ بيانات الحساب بنجاح.",
  });
}
