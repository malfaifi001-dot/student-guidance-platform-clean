import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { schoolSettingsPatchSchema } from "@/lib/settings/school-settings-api-schema";

export async function GET() {
  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json(
      { success: false, error: "يلزم تسجيل الدخول." },
      { status: 401 },
    );
  }

  const profile = current.user.schoolAccount?.profile;
  const signatureKind =
    current.user.role === "COUNSELOR"
      ? "counselor"
      : current.user.role === "ACTIVITY_LEADER"
        ? "activityLeader"
        : current.user.role === "TEACHER"
          ? "teacher"
        : "";

  return NextResponse.json({
    success: true,
    data: {
      officialName: current.user.officialName || current.user.name || "",
      currentUserName: current.user.officialName || current.user.name || "صاحب الحساب",
      currentUserRole: current.user.role,
      currentUserGender: current.user.gender,
      currentUserSignatureKind: signatureKind,
      currentUserSignatureUrl:
        signatureKind === "teacher"
          ? current.user.signatureUrl || ""
          : signatureKind === "counselor"
          ? profile?.counselorSignatureUrl || ""
          : signatureKind === "activityLeader"
            ? profile?.activityLeaderSignatureUrl || ""
            : "",
      currentUserSignedAt:
        signatureKind === "teacher"
          ? current.user.signatureSignedAt?.toISOString() || ""
          : signatureKind === "counselor"
          ? profile?.counselorSignedAt?.toISOString() || ""
          : signatureKind === "activityLeader"
            ? profile?.activityLeaderSignedAt?.toISOString() || ""
            : "",
      jobTitle: current.user.jobTitle || "",
      phone: current.user.phone || "",
      schoolName: profile?.schoolName || "",
      schoolStatisticalNumber: profile?.schoolStatisticalNumber || "",
      principalName: profile?.principalName || "",
      principalPhone: profile?.principalPhone || "",
      principalSignatureUrl: profile?.principalSignatureUrl || "",
      principalSignatureRequestedAt:
        profile?.principalSignatureRequestedAt?.toISOString() || "",
      principalSignatureSignedAt:
        profile?.principalSignatureSignedAt?.toISOString() || "",
      activityLeaderName: profile?.activityLeaderName || "",
      activityLeaderSignatureUrl: profile?.activityLeaderSignatureUrl || "",
      activityLeaderSignedAt:
        profile?.activityLeaderSignedAt?.toISOString() || "",
      counselorSignatureUrl: profile?.counselorSignatureUrl || "",
      counselorSignedAt: profile?.counselorSignedAt?.toISOString() || "",
      educationDepartment: profile?.educationDepartment || "",
      educationOffice: profile?.educationOffice || "",
      city: profile?.city || "",
      district: profile?.district || "",
      stage: profile?.stage || "",
      logoUrl: profile?.logoUrl || "",
      onboardingCompleted: current.user.onboardingCompleted,
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const subscriptionGuard = await requireActiveSubscriptionForCurrentUser();

    if (subscriptionGuard instanceof Response) {
      return subscriptionGuard;
    }

    const current = await getCurrentSessionUser();

    if (!current || !current.user.schoolAccountId) {
      return NextResponse.json(
        { success: false, error: "يلزم تسجيل الدخول." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const payloadResult = schoolSettingsPatchSchema.safeParse(body);

    if (!payloadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            payloadResult.error.issues[0]?.message ||
            "بيانات المدرسة غير صالحة.",
        },
        { status: 400 },
      );
    }

    const {
      officialName,
      jobTitle,
      phone,
      schoolName,
      schoolStatisticalNumber,
      principalName,
      principalPhone,
      activityLeaderName,
      educationDepartment,
      educationOffice,
      city,
      district,
      stage,
      logoUrl,
    } = payloadResult.data;

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: current.user.id,
        },
        data: {
          officialName,
          jobTitle,
          phone,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
        },
      }),
      prisma.schoolAccount.update({
        where: {
          id: current.user.schoolAccountId,
        },
        data: {
          name: officialName || schoolName,
        },
      }),
      prisma.schoolProfile.upsert({
        where: {
          schoolAccountId: current.user.schoolAccountId,
        },
        update: {
          schoolName,
          schoolStatisticalNumber,
          principalName,
          principalPhone,
          activityLeaderName,
          educationDepartment,
          educationOffice,
          city,
          district,
          stage,
          logoUrl,
        },
        create: {
          schoolAccountId: current.user.schoolAccountId,
          schoolName,
          schoolStatisticalNumber,
          principalName,
          principalPhone,
          activityLeaderName,
          educationDepartment,
          educationOffice,
          city,
          district,
          stage,
          logoUrl,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "تم حفظ بيانات المدرسة والحساب.",
    });
  } catch (error) {
    console.error("SCHOOL_SETTINGS_SAVE_ERROR", error);

    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء حفظ إعدادات المدرسة." },
      { status: 500 },
    );
  }
}
