import { isActivityProgramDomainServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import {
  PRINCIPAL_PERFORMANCE_ITEMS,
  isPrincipalPerformanceServiceSlug,
} from "@/lib/principal/performance-items";
import {
  PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES,
  isPrincipalEvaluationAccreditationServiceSlug,
} from "@/lib/principal/evaluation-accreditation-services";

export const PLAN_AUDIENCE_FEATURE_KEY = "targetAudience";

export type PlanAudience = "GUIDANCE" | "ACTIVITY" | "ALL";
export type PlanVisibleRole =
  | "COUNSELOR"
  | "ACTIVITY_LEADER"
  | "TEACHER"
  | "PRINCIPAL"
  | "SCHOOL_OWNER"
  | "STAFF";

type PlanFeatureLike = {
  key: string;
  value: string | null;
};

type PlanVisibilityLike = {
  isActive?: boolean;
  isPublic?: boolean | null;
  isArchived?: boolean | null;
  visibleRoles?: unknown;
  features: PlanFeatureLike[];
};

export const OPERATIONAL_PLAN_ROLES: PlanVisibleRole[] = [
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "PRINCIPAL",
  "SCHOOL_OWNER",
  "STAFF",
];

const LEGACY_ALL_OPERATIONAL_PLAN_ROLES: PlanVisibleRole[] = [
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "SCHOOL_OWNER",
  "STAFF",
];

const PRINCIPAL_PLAN_SERVICE_SLUGS = new Set<string>(
  [
    "assessment-center",
    "certificates-honors",
    "surveys",
    ...PRINCIPAL_PERFORMANCE_ITEMS.map((item) => item.serviceSlug),
    ...PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES.map(
      (service) => service.serviceSlug,
    ),
  ],
);

export function getPlanRoleLabel(role: PlanVisibleRole): string {
  switch (role) {
    case "COUNSELOR":
      return "الموجه";
    case "ACTIVITY_LEADER":
      return "رائد النشاط";
    case "TEACHER":
      return "المعلم";
    case "PRINCIPAL":
      return "مدير المدرسة";
    case "SCHOOL_OWNER":
      return "مالك المدرسة";
    case "STAFF":
      return "الموظف";
  }
}

export function normalizePlanVisibleRoles(value: unknown): PlanVisibleRole[] | null {
  if (!Array.isArray(value)) return null;

  const roles = value.filter((role): role is PlanVisibleRole =>
    OPERATIONAL_PLAN_ROLES.includes(role as PlanVisibleRole),
  );

  return Array.from(new Set(roles));
}

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

export function getDefaultVisibleRolesForAudience(audience: PlanAudience): PlanVisibleRole[] {
  if (audience === "GUIDANCE") return ["COUNSELOR"];
  if (audience === "ACTIVITY") return ["ACTIVITY_LEADER"];
  return [...OPERATIONAL_PLAN_ROLES];
}

export function getPlanVisibilityRoles(plan: PlanVisibilityLike): PlanVisibleRole[] {
  const roles = normalizePlanVisibleRoles(plan.visibleRoles);
  const resolvedRoles =
    roles ?? getDefaultVisibleRolesForAudience(getPlanAudience(plan.features));

  // Before PRINCIPAL existed, selecting every operational role was the stored
  // representation of "all roles". Preserve that intent for existing plans.
  if (
    !resolvedRoles.includes("PRINCIPAL") &&
    LEGACY_ALL_OPERATIONAL_PLAN_ROLES.every((role) => resolvedRoles.includes(role))
  ) {
    return [...resolvedRoles, "PRINCIPAL"];
  }

  return resolvedRoles;
}

export function getRoleEligiblePlanServiceSlugs(
  role: string,
  serviceSlugs: string[],
): string[] {
  if (role !== "PRINCIPAL") return serviceSlugs;
  return serviceSlugs.filter((serviceSlug) =>
    PRINCIPAL_PLAN_SERVICE_SLUGS.has(serviceSlug),
  );
}

function planHasEligibleServiceForRole(plan: PlanVisibilityLike, role: string) {
  if (role !== "PRINCIPAL") return true;

  return plan.features.some(
    (feature) =>
      feature.value === "enabled" &&
      feature.key.startsWith("service:") &&
      PRINCIPAL_PLAN_SERVICE_SLUGS.has(
        feature.key.slice("service:".length).trim(),
      ),
  );
}

export function isPlanVisibleToRole(plan: PlanVisibilityLike, role: string): boolean {
  if (role === "ADMIN") return true;
  return getPlanVisibilityRoles(plan).includes(role as PlanVisibleRole);
}

export function isPlanSelfServiceVisible(plan: PlanVisibilityLike, role: string): boolean {
  if (!plan.isActive) return false;
  if (plan.isPublic === false) return false;
  if (plan.isArchived) return false;
  return isPlanVisibleToRole(plan, role) && planHasEligibleServiceForRole(plan, role);
}

export function isPlanVisibleForRole(audience: PlanAudience, role: string): boolean {
  return getAllowedPlanAudiencesForRole(role).includes(audience);
}

export function classifyServiceSlug(
  slug: string,
): "guidance" | "activity" | "principal" {
  if (isPrincipalPerformanceServiceSlug(slug)) return "principal";
  if (isPrincipalEvaluationAccreditationServiceSlug(slug)) return "principal";
  if (slug === "custom-report") return "guidance";
  if (slug === "assessment-center") return "guidance";
  if (slug === "activity-programs") return "activity";
  if (slug === "school-activity-team") return "activity";
  if (slug.startsWith("activity-programs-")) return "activity";
  if (isActivityProgramDomainServiceSlug(slug)) return "activity";
  return "guidance";
}

export function filterServicesByPlanAudience<T extends { slug: string }>(
  services: T[],
  audience: PlanAudience,
): T[] {
  const billableServices = services.filter(
    (service) => !isActivityProgramDomainServiceSlug(service.slug),
  );

  if (audience === "ALL") return billableServices;
  return billableServices.filter(
    (service) => classifyServiceSlug(service.slug) === audience.toLowerCase(),
  );
}
