import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";

function extractUser(sessionResult: unknown) {
  const value = sessionResult as any;
  return value?.user ?? value?.session?.user ?? value;
}

async function requireAdmin() {
  const sessionResult = await getCurrentSessionUser();
  const user = extractUser(sessionResult);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ success: false, error: "غير مصرح." }, { status: 403 });
  }

  const { userId } = await context.params;
  const body = await request.json();
  const password = String(body.password || "").trim();

  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: "كلمة المرور يجب ألا تقل عن 8 أحرف." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(password),
    },
  });

  return NextResponse.json({ success: true });
}
