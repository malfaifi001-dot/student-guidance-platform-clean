export const COUNSELOR_DASHBOARD_PATH = "/dashboard";
export const ADMIN_DASHBOARD_PATH = "/dashboard/admin";
export const ACTIVITY_LEADER_DASHBOARD_PATH = "/dashboard/activity-leader";
export const TEACHER_DASHBOARD_PATH = "/dashboard/teacher";
export const PRINCIPAL_DASHBOARD_PATH = "/dashboard/principal";

export function getDashboardHomePath(role?: string | null) {
  if (role === "ADMIN") return ADMIN_DASHBOARD_PATH;
  if (role === "ACTIVITY_LEADER") return ACTIVITY_LEADER_DASHBOARD_PATH;
  if (role === "TEACHER") return TEACHER_DASHBOARD_PATH;
  if (role === "PRINCIPAL") return PRINCIPAL_DASHBOARD_PATH;

  return COUNSELOR_DASHBOARD_PATH;
}

export function isDashboardHomePath(pathname: string) {
  return [
    COUNSELOR_DASHBOARD_PATH,
    ADMIN_DASHBOARD_PATH,
    ACTIVITY_LEADER_DASHBOARD_PATH,
    TEACHER_DASHBOARD_PATH,
    PRINCIPAL_DASHBOARD_PATH,
  ].includes(pathname);
}

export function getOnboardingPathForRole(role?: string | null) {
  if (role === "ACTIVITY_LEADER") {
    return "/dashboard/onboarding?role=activity-leader";
  }

  return "/dashboard/onboarding";
}

export function getPostLoginRedirectPath(input: {
  role?: string | null;
  onboardingCompleted?: boolean | null;
  onboardingSkippedAt?: Date | string | null;
}) {
  if (input.role === "ADMIN") return ADMIN_DASHBOARD_PATH;
  if (input.role === "TEACHER") return TEACHER_DASHBOARD_PATH;
  if (input.role === "PRINCIPAL") return PRINCIPAL_DASHBOARD_PATH;

  if (!input.onboardingCompleted && !input.onboardingSkippedAt) {
    return getOnboardingPathForRole(input.role);
  }

  return getDashboardHomePath(input.role);
}
