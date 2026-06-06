import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!process.env.ADMIN_SETUP_TOKEN || token !== process.env.ADMIN_SETUP_TOKEN) {
    return NextResponse.json(
      { success: false, message: "غير مصرح." },
      { status: 401 }
    );
  }

  const email = "admin@smstudents.com";
  const password = "Admin@12345";

  try {
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        name: "مدير المنصة",
        officialName: "مدير المنصة",
        passwordHash: hashPassword(password),
        role: "ADMIN",
        gender: "UNKNOWN",
        isActive: true,
        schoolAccountId: null,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      create: {
        name: "مدير المنصة",
        officialName: "مدير المنصة",
        email,
        passwordHash: hashPassword(password),
        role: "ADMIN",
        gender: "UNKNOWN",
        isActive: true,
        schoolAccountId: null,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء أو تحديث حساب الأدمن بنجاح.",
      admin,
      login: {
        email,
        password,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "فشل إنشاء حساب الأدمن.",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
