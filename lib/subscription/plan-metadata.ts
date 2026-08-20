import { getActivityProgramsBillingServiceSlugs } from "@/lib/activity-programs/activity-program-catalog";

export type PlanFeatureLike = {
  key: string;
  value: string | null;
};

export type CommercialPlanType = "TERM" | "YEAR";
export type PlanDurationMode = "DAYS" | "FIXED_END_DATE";
export type PlanBillingCycle = "MONTHLY" | "YEARLY";

export function getPlanCommercialType(features: PlanFeatureLike[]): CommercialPlanType | null {
  const value = features.find((feature) => feature.key === "commercialType")?.value;
  return value === "TERM" || value === "YEAR" ? value : null;
}

export function getPlanDurationMode(features: PlanFeatureLike[]): PlanDurationMode {
  return features.find((feature) => feature.key === "durationMode")?.value === "FIXED_END_DATE"
    ? "FIXED_END_DATE"
    : "DAYS";
}

export function getPlanFixedEndDate(features: PlanFeatureLike[]): Date | null {
  const raw = features.find((feature) => feature.key === "fixedEndDate")?.value;
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed;
}

export function resolvePlanBillingCycle(features: PlanFeatureLike[], requested: PlanBillingCycle): PlanBillingCycle {
  const commercialType = getPlanCommercialType(features);
  if (commercialType === "TERM") return "MONTHLY";
  if (commercialType === "YEAR") return "YEARLY";
  return requested;
}

export function getPlanServiceSlugs(features: PlanFeatureLike[]) {
  return getActivityProgramsBillingServiceSlugs(
    features
      .filter((feature) => feature.key.startsWith("service:"))
      .filter((feature) => feature.value === "enabled")
      .map((feature) => feature.key.replace("service:", "").trim()),
  );
}
