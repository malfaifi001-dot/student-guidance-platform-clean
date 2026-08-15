export const STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG =
  "student-activity-competitions";

export const STUDENT_ACTIVITY_COMPETITIONS_SERVICE = {
  slug: STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG,
  title: "مسابقات الأنشطة الطلابية",
  description:
    "إدارة مسابقات الأنشطة الطلابية عبر نماذج سير العمل المعتمدة والحالات والتقارير المرتبطة بها.",
  href: "/dashboard/activity-leader/competitions",
  kind: "workflow" as const,
};

export function isStudentActivityCompetitionsServiceSlug(
  serviceSlug: string | null | undefined,
) {
  return serviceSlug === STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG;
}

export function canUseStudentActivityCompetitionsService(role: string) {
  return role === "ADMIN" || role === "ACTIVITY_LEADER";
}
