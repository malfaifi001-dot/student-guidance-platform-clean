import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const current = await getCurrentSessionUser();

    if (!current) {
      return NextResponse.json(
        { success: false, error: "يلزم تسجيل الدخول." },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: {
        id: current.user.id,
      },
      data: {
        onboardingSkippedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    console.error("ONBOARDING_SKIP_ERROR", error);

    return NextResponse.json(
      { success: false, error: "تعذر تخطي إعداد الحساب." },
      { status: 500 }
    );
  }
}
