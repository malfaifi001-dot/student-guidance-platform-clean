import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { logAuthLogoutEvent } from "@/lib/admin/activity-events";

export async function POST() {
  const current = await getCurrentSessionUser();
  const currentSession = current as
    | {
        tokenId?: string | null;
        user?: {
          id: string;
          email?: string | null;
          schoolAccountId?: string | null;
        };
      }
    | null;

  if (currentSession?.user?.id) {
    await logAuthLogoutEvent({
      userId: currentSession.user.id,
      schoolAccountId: currentSession.user.schoolAccountId || null,
      email: currentSession.user.email || null,
    });

    if (currentSession.tokenId) {
      await prisma.userSession.updateMany({
        where: {
          tokenId: currentSession.tokenId,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });
    } else {
      await prisma.userSession.updateMany({
        where: {
          userId: currentSession.user.id,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });
    }
  }

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return NextResponse.json({
    message: "تم تسجيل الخروج.",
  });
}
