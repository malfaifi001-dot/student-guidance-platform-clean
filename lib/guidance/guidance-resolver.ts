import { GUIDANCE_REGISTRY } from "@/lib/guidance/guidance-registry";
import type { GuidanceContextKey, GuidanceRole, GuidanceStep } from "@/lib/guidance/guidance-types";

export function isGuidanceRole(role?: string | null): role is GuidanceRole {
  return role === "COUNSELOR" || role === "TEACHER" || role === "ACTIVITY_LEADER";
}

export function resolveGuidanceSteps({ context, role, capabilities }: { context: GuidanceContextKey; role: GuidanceRole; capabilities: string[] }): GuidanceStep[] {
  const capabilitySet = new Set(capabilities);
  const steps = GUIDANCE_REGISTRY[context].steps.filter((step) => {
    if (step.allowedRoles && !step.allowedRoles.includes(role)) return false;
    if (step.requiredCapability && !capabilitySet.has(step.requiredCapability)) return false;
    return true;
  });

  return context === "report-studio" ? steps : steps.slice(0, 3);
}
