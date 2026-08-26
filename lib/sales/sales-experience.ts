import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export const SALES_EXPERIENCE_CONFIG_KEY = "teachix-sales-experience";
export type SalesExperienceMode = "SERVICE" | "BAG";

export type SalesExperienceResolution = {
  globalMode: SalesExperienceMode;
  effectiveMode: SalesExperienceMode;
  source: "GLOBAL" | "USER_OVERRIDE";
  isBagMode: boolean;
};

function mode(value: unknown): SalesExperienceMode {
  return value === "BAG" ? "BAG" : "SERVICE";
}

export async function getGlobalSalesExperienceMode(): Promise<SalesExperienceMode> {
  const config = await prisma.salesExperienceConfig.findUnique({
    where: { singletonKey: SALES_EXPERIENCE_CONFIG_KEY },
    select: { globalMode: true },
  });
  return mode(config?.globalMode);
}

export async function resolveSalesExperienceForUser(
  userId: string,
): Promise<SalesExperienceResolution> {
  const [globalMode, override] = await Promise.all([
    getGlobalSalesExperienceMode(),
    prisma.salesExperienceUserOverride.findUnique({
      where: { userId },
      select: { mode: true },
    }),
  ]);
  const effectiveMode = override ? mode(override.mode) : globalMode;
  return {
    globalMode,
    effectiveMode,
    source: override ? "USER_OVERRIDE" : "GLOBAL",
    isBagMode: effectiveMode === "BAG",
  };
}

export async function resolveSalesExperienceForCurrentUser() {
  const current = await getCurrentSessionUser();
  if (!current?.user?.id) return null;
  return resolveSalesExperienceForUser(current.user.id);
}

export async function isBagModeForCurrentUser() {
  const resolution = await resolveSalesExperienceForCurrentUser();
  return Boolean(resolution?.isBagMode);
}
