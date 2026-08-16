import { TeacherWorkspacePage } from "@/components/workspace/teacher-workspace-page";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { calculateSchoolIdentityReadiness } from "@/lib/school-identity-readiness";

export default async function TeacherDashboardPage() {
  const context = await requireDashboardPageContext();
  const current = await getCurrentSessionUser();
  const identityReadiness = current
    ? calculateSchoolIdentityReadiness(
        {
          officialName: current.user.officialName,
          jobTitle: current.user.jobTitle,
          phone: current.user.phone,
          schoolName: current.user.schoolAccount?.profile?.schoolName,
          principalName: current.user.schoolAccount?.profile?.principalName,
          educationDepartment:
            current.user.schoolAccount?.profile?.educationDepartment,
          educationOffice: current.user.schoolAccount?.profile?.educationOffice,
          city: current.user.schoolAccount?.profile?.city,
          district: current.user.schoolAccount?.profile?.district,
          stage: current.user.schoolAccount?.profile?.stage,
          logoUrl: current.user.schoolAccount?.profile?.logoUrl,
        },
        { role: current.user.role, gender: current.user.gender },
      )
    : null;

  return (
    <TeacherWorkspacePage
      user={context.user}
      schoolAccountId={context.schoolAccountId}
      schoolIdentityComplete={identityReadiness?.score === 100}
    />
  );
}
