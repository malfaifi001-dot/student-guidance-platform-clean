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

  const sessions = await prisma.userSession.findMany({
    where: {
      userId: current.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 12,
    select: {
      id: true,
      tokenId: true,
      userAgent: true,
      ipAddress: true,
      isActive: true,
      expiresAt: true,
      lastSeenAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: current.user.id,
        name: current.user.name || "",
        officialName: current.user.officialName || "",
        email: current.user.email || "",
        phone: current.user.phone || "",
        gender: current.user.gender || "UNKNOWN",
        role: current.user.role,
        jobTitle: current.user.jobTitle || "",
        onboardingCompleted: current.user.onboardingCompleted,
        schoolName:
          current.user.schoolAccount?.profile?.schoolName ||
          current.user.schoolAccount?.name ||
          "",
      },
      currentSessionId: current.session.id,
      sessions,
      singleActiveSessionEnabled:
        process.env.AUTH_SINGLE_ACTIVE_SESSION === "true",
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const current = await getCurrentSessionUser();

    if (!current) {
      return NextResponse.json(
        { success: false, error: "يلزم تسجيل الدخول." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name = String(body?.name || "").trim();
    const officialName = String(body?.officialName || "").trim();
    const phone = String(body?.phone || "").trim();
    const jobTitle = String(body?.jobTitle || "").trim();
    const gender = body?.gender === "FEMALE" ? "FEMALE" : "MALE";

    if (!name || name.length < 3) {
      return NextResponse.json(
        { success: false, error: "الاسم مطلوب ويجب ألا يقل عن 3 أحرف." },
        { status: 400 }
      );
    }

    if (!officialName || !jobTitle) {
      return NextResponse.json(
        { success: false, error: "الاسم الرسمي والمسمى الوظيفي مطلوبان." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: {
        id: current.user.id,
      },
      data: {
        name,
        officialName,
        phone,
        jobTitle,
        gender,
      },
      select: {
        id: true,
        name: true,
        officialName: true,
        phone: true,
        jobTitle: true,
        gender: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
      message: "تم حفظ بيانات الحساب.",
    });
  } catch (error) {
    console.error("ACCOUNT_UPDATE_ERROR", error);

    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء حفظ بيانات الحساب." },
      { status: 500 }
    );
  }
}
