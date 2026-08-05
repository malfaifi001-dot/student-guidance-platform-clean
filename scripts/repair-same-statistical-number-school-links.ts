import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const REPAIRABLE_SCHOOL_MEMBER_ROLES = [
  "TEACHER",
  "COUNSELOR",
  "ACTIVITY_LEADER",
] as const;

function normalizeStatisticalNumber(value: unknown) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[\s-]+/g, "")
    .trim();
}

function completenessScore(profile: {
  schoolName: string;
  principalName: string | null;
  educationDepartment: string | null;
  city: string | null;
  stage: string | null;
}) {
  return [
    profile.schoolName,
    profile.principalName,
    profile.educationDepartment,
    profile.city,
    profile.stage,
  ].filter((value) => value?.trim()).length;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not defined");

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });
  const apply = process.argv.includes("--apply");

  try {
    const profiles = await prisma.schoolProfile.findMany({
      include: {
        schoolAccount: {
          select: {
            id: true,
            createdAt: true,
            users: {
              select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    const groups = new Map<string, typeof profiles>();
    for (const profile of profiles) {
      const normalized = normalizeStatisticalNumber(
        profile.schoolStatisticalNumber,
      );
      if (!normalized) continue;
      const group = groups.get(normalized) ?? [];
      group.push(profile);
      groups.set(normalized, group);
    }

    const duplicates = [...groups.entries()].filter(
      ([, group]) => group.length > 1,
    );
    const changes: Array<{
      statisticalNumber: string;
      userId: string;
      userEmail: string;
      role: (typeof REPAIRABLE_SCHOOL_MEMBER_ROLES)[number];
      oldSchoolAccountId: string;
      newSchoolAccountId: string;
    }> = [];

    for (const [statisticalNumber, group] of duplicates) {
      const ranked = [...group].sort((left, right) => {
        const leftHasPrincipal = left.schoolAccount.users.some(
          (user) => user.role === "PRINCIPAL" && user.isActive,
        );
        const rightHasPrincipal = right.schoolAccount.users.some(
          (user) => user.role === "PRINCIPAL" && user.isActive,
        );
        if (leftHasPrincipal !== rightHasPrincipal) {
          return leftHasPrincipal ? -1 : 1;
        }
        const scoreDifference =
          completenessScore(right) - completenessScore(left);
        if (scoreDifference) return scoreDifference;
        return (
          left.schoolAccount.createdAt.getTime() -
          right.schoolAccount.createdAt.getTime()
        );
      });

      const canonical = ranked[0];
      for (const duplicate of ranked.slice(1)) {
        for (const user of duplicate.schoolAccount.users) {
          const role = REPAIRABLE_SCHOOL_MEMBER_ROLES.find(
            (candidate) => candidate === user.role,
          );
          if (!role) continue;
          changes.push({
            statisticalNumber,
            userId: user.id,
            userEmail: user.email,
            role,
            oldSchoolAccountId: duplicate.schoolAccountId,
            newSchoolAccountId: canonical.schoolAccountId,
          });
        }
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: apply ? "apply" : "dry-run",
          duplicateGroups: duplicates.length,
          changes,
        },
        null,
        2,
      ),
    );

    if (!apply) {
      console.log("لم تُطبق أي تعديلات. استخدم --apply للتنفيذ.");
      return;
    }

    for (const change of changes) {
      await prisma.$transaction(async (tx) => {
        await tx.user.updateMany({
          where: {
            id: change.userId,
            role: change.role,
            schoolAccountId: change.oldSchoolAccountId,
          },
          data: { schoolAccountId: change.newSchoolAccountId },
        });
      });
      console.log(
        `${change.role} ${change.userEmail}: ${change.oldSchoolAccountId} -> ${change.newSchoolAccountId}`,
      );
    }

    console.log(`اكتمل الإصلاح. عدد روابط منسوبي المدرسة المحدثة: ${changes.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("REPAIR_SAME_STATISTICAL_NUMBER_SCHOOL_LINKS_ERROR", error);
  process.exitCode = 1;
});
