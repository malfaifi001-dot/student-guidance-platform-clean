import { AssessmentsCenterHome } from "@/components/assessments-center/assessments-center-home";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

export default async function AssessmentsCenterPage() {
  const context = await requireDashboardPageContext({ allowPrincipal: true });
  return <AssessmentsCenterHome gender={context.user.gender} />;
}
