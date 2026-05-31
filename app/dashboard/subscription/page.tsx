import { CounselorActivationCenter } from "@/components/activation/counselor-activation-center";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function SubscriptionPage() {
  await requireDashboardUser();

  return <CounselorActivationCenter />;
}
