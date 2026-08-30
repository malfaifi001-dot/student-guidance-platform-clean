import { AssessmentNewClient } from "@/components/assessments-center/assessment-new-client";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

export default async function NewAssessmentPage() {
  const context = await requireDashboardPageContext({ allowPrincipal: true });
  return <AssessmentNewClient gender={context.user.gender} />;
}
