import type { ReactNode } from "react";

import { ensureDashboardWorkflowService } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

const TEACHER_REPORT_SERVICE_SLUG = "teacher-report-issuance";

export default async function TeacherReportIssuanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  await ensureDashboardWorkflowService(TEACHER_REPORT_SERVICE_SLUG);
  await requireServiceAccessForCurrentUser(TEACHER_REPORT_SERVICE_SLUG);

  return <>{children}</>;
}
