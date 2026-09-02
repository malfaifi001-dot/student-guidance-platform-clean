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

export async function filterWorkflowSearchServiceSlugs(input: {
  role: string;
  userId: string;
  schoolAccountId: string;
  serviceSlugs: string[];
}) {
  if (input.role === "ADMIN") return new Set(input.serviceSlugs);

  const roleSlugs = getWorkflowSearchRoleServiceSlugs(input.role) || [];
  const candidates = input.serviceSlugs.filter((slug) => roleSlugs.includes(slug));
  const access = await Promise.all(
    [...new Set(candidates)].map(async (serviceSlug) => ({
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
