import { isActivityProgramDomainServiceSlug } from "@/lib/activity-programs/activity-program-catalog";

export const PLAN_AUDIENCE_FEATURE_KEY = "targetAudience";

export type PlanAudience = "GUIDANCE" | "ACTIVITY" | "ALL";

type PlanFeatureLike = {
  key: string;
  value: string | null;
};

export function getPlanAudience(features: PlanFeatureLike[]): PlanAudience {
  const value = features.find((f) => f.key === PLAN_AUDIENCE_FEATURE_KEY)?.value;
  if (value === "GUIDANCE" || value === "ACTIVITY") return value;
  return "ALL";
}

export function getPlanAudienceLabel(audience: PlanAudience): string {
  switch (audience) {
    case "GUIDANCE":
      return "الموجه الطلابي";
    case "ACTIVITY":
      return "رائد النشاط";
    case "ALL":
      return "الكل";
  }
}

export function getAllowedPlanAudiencesForRole(role: string): PlanAudience[] {
  if (role === "ADMIN") return ["GUIDANCE", "ACTIVITY", "ALL"];
  if (role === "COUNSELOR") return ["GUIDANCE", "ALL"];
  if (role === "ACTIVITY_LEADER") return ["ACTIVITY", "ALL"];
  return ["ALL"];
}

export function isPlanVisibleForRole(audience: PlanAudience, role: string): boolean {
  return getAllowedPlanAudiencesForRole(role).includes(audience);
}

export function classifyServiceSlug(slug: string): "guidance" | "activity" {
  if (slug === "activity-programs") return "activity";
  if (slug.startsWith("activity-programs-")) return "activity";
  if (isActivityProgramDomainServiceSlug(slug)) return "activity";
  return "guidance";
}

export function filterServicesByPlanAudience<T extends { slug: string }>(
  services: T[],
  audience: PlanAudience,
): T[] {
  if (audience === "ALL") return services;
  return services.filter((s) => classifyServiceSlug(s.slug) === audience.toLowerCase());
}
