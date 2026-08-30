import { COUNSELOR_GUIDANCE_WORKFLOW_SERVICES } from "@/lib/constants/services";
import { TEACHER_PERFORMANCE_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";

export type StatisticsRoleServiceDefinition = {
  slug: string;
  name: string;
};

function uniqueDefinitions(
  definitions: StatisticsRoleServiceDefinition[],
) {
  const seen = new Set<string>();

  return definitions.filter((definition) => {
    if (seen.has(definition.slug)) return false;
    seen.add(definition.slug);
    return true;
  });
}

export function getStatisticsServiceDefinitionsForRole(
  role: string,
): StatisticsRoleServiceDefinition[] | null {
  if (role === "ADMIN") return null;

  if (role === "COUNSELOR") {
    return uniqueDefinitions(
      COUNSELOR_GUIDANCE_WORKFLOW_SERVICES.map((service) => ({
        slug: service.slug,
        name: service.title,
      })),
    );
  }

  if (role === "TEACHER") {
    return uniqueDefinitions(
      TEACHER_PERFORMANCE_SERVICES.map((service) => ({
        slug: service.slug,
        name: service.title,
      })),
    );
  }

  if (role === "PRINCIPAL") {
    return uniqueDefinitions(
      TEACHER_PERFORMANCE_SERVICES.map((service) => ({
        slug: service.slug,
        name: service.title,
      })),
    );
  }

  return [];
}
