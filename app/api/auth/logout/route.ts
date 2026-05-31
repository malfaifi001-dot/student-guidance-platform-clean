import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const session = verifySessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  if (session?.tokenId) {
    await prisma.userSession.updateMany({
      where: {
        tokenId: session.tokenId,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
  }

  const response = NextResponse.json({
    success: true,
    redirectTo: "/login",
  });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
