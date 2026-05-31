import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const current = await getCurrentSessionUser();

    if (!current) {
      return NextResponse.json(
        { success: false, error: "يلزم تسجيل الدخول." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");
    const confirmPassword = String(body?.confirmPassword || "");

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور الجديدة وتأكيدها غير متطابقين." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: current.user.id,
      },
      select: {
        passwordHash: true,
      },
    });

    if (!verifyPassword(currentPassword, user?.passwordHash)) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور الحالية غير صحيحة." },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: {
        id: current.user.id,
      },
      data: {
        passwordHash: hashPassword(newPassword),
      },
    });

    await prisma.userSession.updateMany({
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
      message: "تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى.",
    });
  } catch (error) {
    console.error("ACCOUNT_PASSWORD_CHANGE_ERROR", error);

    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تغيير كلمة المرور." },
      { status: 500 }
    );
  }
}
