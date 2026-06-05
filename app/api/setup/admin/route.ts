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
        message: "غير مصرح.",
      },
      { status: 401 }
    );
  }

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
    },
  });

  return NextResponse.json({
    success: true,
    message: "تم إنشاء/تحديث حساب الأدمن بنجاح.",
    admin,
  });
}
