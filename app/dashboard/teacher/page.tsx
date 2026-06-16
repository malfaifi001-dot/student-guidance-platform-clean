import { TeacherWorkspacePage } from "@/components/workspace/teacher-workspace-page";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

export default async function TeacherDashboardPage() {
  const context = await requireDashboardPageContext();

  return (
    <TeacherWorkspacePage
      user={context.user}
      schoolAccountId={context.schoolAccountId}
    />
  );
}