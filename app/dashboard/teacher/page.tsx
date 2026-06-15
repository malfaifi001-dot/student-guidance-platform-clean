import { TeacherWorkspacePage } from "@/components/workspace/teacher-workspace-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function TeacherDashboardPage() {
  const current = await requireDashboardUser();

  return <TeacherWorkspacePage user={current.user} />;
}