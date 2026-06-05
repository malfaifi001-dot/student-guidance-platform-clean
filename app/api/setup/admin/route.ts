import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!process.env.ADMIN_SETUP_TOKEN || token !== process.env.ADMIN_SETUP_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        step: "auth",
        message: "غير مصرح.",
      },
      { status: 401 }
    );
  }

  try {
    const email = "admin@student-guidance.local";
    const password = "Admin@12345";

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.user.upsert({
      where: {
        email,
      },
      update: {
        name: "مدير المنصة",
        officialName: "مدير المنصة",
        passwordHash,
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
        passwordHash,
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
      step: "admin-upsert",
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
        step: "admin-upsert",
        message: "فشل إنشاء الأدمن.",
        errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
