import "server-only";

import { Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { buildTransitionalPhoneEmail } from "@/lib/auth/login-identifier";
import type { PublicRegistrationInput } from "@/lib/auth/public-registration-schema";
import { prisma } from "@/lib/prisma";

function createSlugFromName(name: string) {
  const base = name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${base || "school"}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPublicRegistrationJobTitle(role: PublicRegistrationInput["accountType"], gender: PublicRegistrationInput["gender"]) {
  if (role === "PRINCIPAL") return gender === "FEMALE" ? "مديرة المدرسة" : "مدير المدرسة";
  if (role === "ACTIVITY_LEADER") return gender === "FEMALE" ? "رائدة النشاط" : "رائد النشاط";
  if (role === "TEACHER") return gender === "FEMALE" ? "معلمة" : "معلم";
  return gender === "FEMALE" ? "موجهة طلابية" : "موجه طلابي";
}

type SessionInput = { tokenId: string; expiresAt: Date; userAgent: string | null; ipAddress: string | null };

export async function registerPublicAccount(input: PublicRegistrationInput, sessionInput: SessionInput) {
  return prisma.$transaction(async (tx) => {
    const internalEmail = buildTransitionalPhoneEmail(input.phone);
    const existingUser = await tx.user.findFirst({
      where: { OR: [{ phone: input.phone }, { email: internalEmail }] },
      select: { id: true },
    });
    if (existingUser) throw new Error("DUPLICATE_PHONE");

    const schoolAccount = await tx.schoolAccount.create({
      data: {
        name: `مدرسة ${input.name}`,
        slug: createSlugFromName(input.name),
      },
      select: { id: true, name: true },
    });

    const user = await tx.user.create({
      data: {
        schoolAccountId: schoolAccount.id,
        name: input.name,
        officialName: input.name,
        // Transitional compatibility value while User.email remains required.
        email: internalEmail,
        phone: input.phone,
        passwordHash: hashPassword(input.password),
        role: input.accountType,
        gender: input.gender,
        jobTitle: getPublicRegistrationJobTitle(input.accountType, input.gender),
        onboardingCompleted: false,
        onboardingCompletedAt: null,
        onboardingSkippedAt: new Date(),
      },
    });

    const session = await tx.userSession.create({
      data: { userId: user.id, ...sessionInput },
    });

    return { user, schoolAccount, session };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
