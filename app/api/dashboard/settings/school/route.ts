import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json(
      { success: false, error: "يلزم تسجيل الدخول." },
      { status: 401 }
    );
  }

  const profile = current.user.schoolAccount?.profile;

  return NextResponse.json({
    success: true,
    data: {
      officialName: current.user.officialName || current.user.name || "",
      jobTitle: current.user.jobTitle || "",
      phone: current.user.phone || "",
      schoolName: profile?.schoolName || "",
      principalName: profile?.principalName || "",
      educationDepartment: profile?.educationDepartment || "",
      educationOffice: profile?.educationOffice || "",
      city: profile?.city || "",
      district: profile?.district || "",
      stage: profile?.stage || "",
      academicYear: profile?.academicYear || "",
      currentSemester: profile?.currentSemester || "",
      logoUrl: profile?.logoUrl || "",
      onboardingCompleted: current.user.onboardingCompleted,
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const current = await getCurrentSessionUser();

    if (!current || !current.user.schoolAccountId) {
      return NextResponse.json(
        { success: false, error: "يلزم تسجيل الدخول." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const officialName = String(body?.officialName || "").trim();
    const jobTitle = String(body?.jobTitle || "").trim();
    const phone = String(body?.phone || "").trim();
    const schoolName = String(body?.schoolName || "").trim();
    const principalName = String(body?.principalName || "").trim();
    const educationDepartment = String(body?.educationDepartment || "").trim();
    const educationOffice = String(body?.educationOffice || "").trim();
    const city = String(body?.city || "").trim();
    const district = String(body?.district || "").trim();
    const stage = String(body?.stage || "").trim();
    const academicYear = String(body?.academicYear || "").trim();
    const currentSemester = String(body?.currentSemester || "").trim();
    const logoUrl = String(body?.logoUrl || "").trim();

    if (!officialName || !jobTitle || !schoolName) {
      return NextResponse.json(
        {
          success: false,
          error: "الاسم الرسمي، المسمى الوظيفي، واسم المدرسة مطلوبة.",
        },
        { status: 400 }
      );
    }

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
          principalName,
          educationDepartment,
          educationOffice,
          city,
          district,
          stage,
          academicYear,
          currentSemester,
          logoUrl,
        },
        create: {
          schoolAccountId: current.user.schoolAccountId,
          schoolName,
          principalName,
          educationDepartment,
          educationOffice,
          city,
          district,
          stage,
          academicYear,
          currentSemester,
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
      { status: 500 }
    );
  }
}

