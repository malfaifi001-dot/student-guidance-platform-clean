import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = verifySessionToken(
      cookieStore.get(SESSION_COOKIE_NAME)?.value
    );

    if (!session?.userId || !session.schoolAccountId) {
      return NextResponse.json(
        { success: false, error: "يلزم تسجيل الدخول." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const officialName = String(body?.officialName || "").trim();
    const jobTitle = String(body?.jobTitle || "").trim();
    const schoolName = String(body?.schoolName || "").trim();
    const principalName = String(body?.principalName || "").trim();
    const educationDepartment = String(body?.educationDepartment || "").trim();
    const educationOffice = String(body?.educationOffice || "").trim();
    const city = String(body?.city || "").trim();
    const district = String(body?.district || "").trim();
    const stage = String(body?.stage || "").trim();
    const academicYear = String(body?.academicYear || "").trim();
    const currentSemester = String(body?.currentSemester || "").trim();

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
          id: session.userId,
        },
        data: {
          officialName,
          jobTitle,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
        },
      }),

      prisma.schoolAccount.update({
        where: {
          id: session.schoolAccountId,
        },
        data: {
          name: officialName || schoolName,
        },
      }),

      prisma.schoolProfile.upsert({
        where: {
          schoolAccountId: session.schoolAccountId,
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
        },
        create: {
          schoolAccountId: session.schoolAccountId,
          schoolName,
          principalName,
          educationDepartment,
          educationOffice,
          city,
          district,
          stage,
          academicYear,
          currentSemester,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    console.error("ONBOARDING_ERROR", error);

    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء حفظ بيانات المدرسة." },
      { status: 500 }
    );
  }
}

