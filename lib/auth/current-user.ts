import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionPayload = verifySessionToken(token);

  if (!sessionPayload) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: {
      tokenId: sessionPayload.tokenId,
    },
    include: {
      user: {
        include: {
          schoolAccount: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  if (!session || !session.isActive || session.revokedAt) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.userSession.update({
      where: {
        id: session.id,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    return null;
  }

  await prisma.userSession.update({
    where: {
      id: session.id,
    },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return {
    session,
    user: session.user,
  };
}

export async function getRequestDeviceInfo() {
  const headerStore = await headers();

  return {
    userAgent: headerStore.get("user-agent") || null,
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      null,
  };
}
