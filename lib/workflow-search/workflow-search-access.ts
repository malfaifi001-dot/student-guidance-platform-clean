import { TEACHER_PERFORMANCE_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";
import { isServiceAllowedForUser } from "@/lib/subscription/subscription-service";

const ROLE_SERVICE_SLUGS: Record<string, string[]> = {
  TEACHER: [
    ...TEACHER_PERFORMANCE_SERVICES.map((service) => service.slug),
    "teacher-report-issuance",
    "special-report",
  ],
};

export function getWorkflowSearchRoleServiceSlugs(role: string) {
  return ROLE_SERVICE_SLUGS[role] || null;
}

export async function resolveAllowedWorkflowSearchServiceSlugs(input: {
  role: string;
  userId: string;
  schoolAccountId: string;
}) : Promise<Set<string> | null> {
  if (input.role === "ADMIN") return null;

  const roleSlugs = getWorkflowSearchRoleServiceSlugs(input.role) || [];
  const access = await Promise.all(
    roleSlugs.map(async (serviceSlug) => ({
      serviceSlug,
      allowed: await isServiceAllowedForUser({
        userId: input.userId,
        schoolAccountId: input.schoolAccountId,
        serviceSlug,
      }),
    })),
  );
  return new Set(access.filter((item) => item.allowed.ok).map((item) => item.serviceSlug));
}
