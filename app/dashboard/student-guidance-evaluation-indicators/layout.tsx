import { redirect } from "next/navigation";

import { ensureDashboardWorkflowService } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

const SERVICE_SLUG = "student-guidance-evaluation-indicators";

export default async function StudentGuidanceEvaluationIndicatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDashboardWorkflowService(SERVICE_SLUG);

  const current = await requireServiceAccessForCurrentUser(SERVICE_SLUG);

  if (current.user.role !== "ADMIN" && current.user.role !== "COUNSELOR") {
    redirect("/dashboard");
  }

  return children;
}
