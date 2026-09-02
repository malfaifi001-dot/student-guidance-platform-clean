import { CounselorPlansPage } from "@/components/subscription/counselor-plans-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function SubscriptionPage() {
  await requireDashboardUser();

  return <CounselorPlansPage />;
}
