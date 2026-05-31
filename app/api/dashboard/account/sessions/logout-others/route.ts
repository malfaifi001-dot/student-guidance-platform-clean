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

    const result = await prisma.userSession.updateMany({
      where: {
        userId: current.user.id,
        id: {
          not: current.session.id,
        },
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      revokedCount: result.count,
      message: "تم تسجيل الخروج من الأجهزة الأخرى.",
    });
  } catch (error) {
    console.error("LOGOUT_OTHER_SESSIONS_ERROR", error);

    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء إنهاء الجلسات الأخرى." },
      { status: 500 }
    );
  }
}
