import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

type SchoolAccountLite = {
  id: string;
  name: string;
  slug?: string | null;
};

type CurrentUserLite = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  gender?: string | null;
  schoolAccountId?: string | null;
  isActive?: boolean;
  schoolAccount?: SchoolAccountLite | null;
};

export type SchoolUserContext = {
  user: CurrentUserLite;
  schoolAccountId: string;
  schoolName: string;
};

function decodeJwtPayload(value: string): Record<string, unknown> | null {
  const parts = value.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function findUserById(userId: string): Promise<CurrentUserLite | null> {
  const user = await prisma.user
    .findUnique({
      where: { id: userId },
      include: { schoolAccount: true },
    })
    .catch(() => null);

  if (!user || user.isActive === false) {
    return null;
  }

  return user as CurrentUserLite;
}

async function findUserByEmail(email: string): Promise<CurrentUserLite | null> {
  const user = await prisma.user
    .findUnique({
      where: { email },
      include: { schoolAccount: true },
    })
    .catch(() => null);

  if (!user || user.isActive === false) {
    return null;
  }

  return user as CurrentUserLite;
}

async function findUserFromUnifiedSession(): Promise<CurrentUserLite | null> {
  const current = await getCurrentSessionUser().catch(() => null);
  const userId = current?.user?.id ? String(current.user.id).trim() : "";

  if (!userId) {
    return null;
  }

  return findUserById(userId);
}

async function findUserFromCookieValue(
  value: string,
): Promise<CurrentUserLite | null> {
  const direct = value.trim();

  if (!direct) {
    return null;
  }

  const payload = decodeJwtPayload(direct);

  const possibleId =
    readString(payload?.sub) ||
    readString(payload?.userId) ||
    readString(payload?.id) ||
    readString(payload?.uid) ||
    (!direct.includes(".") && direct.length >= 10 ? direct : null);

  const possibleEmail = readString(payload?.email);

  if (possibleId) {
    const user = await findUserById(possibleId);

    if (user) {
      return user;
    }
  }

  if (possibleEmail) {
    const user = await findUserByEmail(possibleEmail);

    if (user) {
      return user;
    }
  }

  return null;
}

async function findUserFromLegacyCookies(): Promise<CurrentUserLite | null> {
  const cookieStore = await cookies();

  const prioritizedCookieNames = [
    "student-guidance-session",
    "student_guidance_session",
    "auth-token",
    "auth_token",
    "session",
    "token",
    "userId",
    "student-guidance-user-id",
  ];

  const cookieValues: string[] = [];

  for (const name of prioritizedCookieNames) {
    const value = cookieStore.get(name)?.value;

    if (value) {
      cookieValues.push(value);
    }
  }

  for (const item of cookieStore.getAll()) {
    if (item.value && !cookieValues.includes(item.value)) {
      cookieValues.push(item.value);
    }
  }

  for (const value of cookieValues) {
    const user = await findUserFromCookieValue(value);

    if (user) {
      return user;
    }
  }

  return null;
}

async function findDevelopmentFallbackUser(): Promise<CurrentUserLite | null> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const user = await prisma.user
    .findFirst({
      where: {
        schoolAccountId: { not: null },
        isActive: true,
      },
      include: { schoolAccount: true },
      orderBy: { createdAt: "asc" },
    })
    .catch(() => null);

  return user as CurrentUserLite | null;
}

export async function resolveCurrentSchoolContext(): Promise<SchoolUserContext> {
  const user =
    (await findUserFromUnifiedSession()) ||
    (await findUserFromLegacyCookies()) ||
    (await findDevelopmentFallbackUser());

  if (!user || !user.schoolAccountId) {
    throw new Error("UNAUTHENTICATED_SCHOOL_USER");
  }

  return {
    user,
    schoolAccountId: user.schoolAccountId,
    schoolName: user.schoolAccount?.name || "مدرستي",
  };
}
