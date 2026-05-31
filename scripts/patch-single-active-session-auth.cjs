const fs = require("fs");

function patchAuthRoute(path) {
  let content = fs.readFileSync(path, "utf8");

  content = content.replace(
`  createSessionToken,
  getSessionCookieOptions,`,
`  createSessionToken,
  createTokenId,
  getSessionCookieOptions,
  getSessionExpiryDate,`
  );

  if (!content.includes(`import { getRequestDeviceInfo } from "@/lib/auth/current-user";`)) {
    content = content.replace(
`import {`,
`import { getRequestDeviceInfo } from "@/lib/auth/current-user";
import {`
    );
  }

  return content;
}

/* register */
let register = patchAuthRoute("app/api/auth/register/route.ts");

register = register.replace(
`    const result = await prisma.$transaction(async (tx) => {`,
`    const deviceInfo = await getRequestDeviceInfo();
    const tokenId = createTokenId();
    const expiresAt = getSessionExpiryDate();

    const result = await prisma.$transaction(async (tx) => {`
);

register = register.replace(
`      return { user, schoolAccount };
    });`,
`      await tx.userSession.updateMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      const session = await tx.userSession.create({
        data: {
          userId: user.id,
          tokenId,
          expiresAt,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
        },
      });

      return { user, schoolAccount, session };
    });`
);

register = register.replace(
`        schoolAccountId: result.schoolAccount.id,`,
`        schoolAccountId: result.schoolAccount.id,
        sessionId: result.session.id,
        tokenId,`
);

fs.writeFileSync("app/api/auth/register/route.ts", register, "utf8");


/* login */
let login = patchAuthRoute("app/api/auth/login/route.ts");

login = login.replace(
`    const response = NextResponse.json({
      success: true,
      redirectTo: user.onboardingCompleted
        ? "/dashboard"
        : "/dashboard/onboarding",
    });`,
`    const deviceInfo = await getRequestDeviceInfo();
    const tokenId = createTokenId();
    const expiresAt = getSessionExpiryDate();

    await prisma.$transaction(async (tx) => {
      await tx.userSession.updateMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });
    });

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenId,
        expiresAt,
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
      },
    });

    const response = NextResponse.json({
      success: true,
      redirectTo:
        user.onboardingCompleted || user.onboardingSkippedAt
          ? "/dashboard"
          : "/dashboard/onboarding",
    });`
);

login = login.replace(
`        schoolAccountId: user.schoolAccountId,`,
`        schoolAccountId: user.schoolAccountId,
        sessionId: session.id,
        tokenId,`
);

fs.writeFileSync("app/api/auth/login/route.ts", login, "utf8");


/* logout */
let logout = fs.readFileSync("app/api/auth/logout/route.ts", "utf8");

if (!logout.includes("verifySessionToken")) {
  logout = logout.replace(
`import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";`,
`import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";`
  );

  logout = logout.replace(
`export async function POST() {
  const response = NextResponse.json({`,
`export async function POST() {
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

  const response = NextResponse.json({`
  );
}

fs.writeFileSync("app/api/auth/logout/route.ts", logout, "utf8");

console.log("تم تفعيل جلسة واحدة لكل حساب وتحديث login/register/logout.");
