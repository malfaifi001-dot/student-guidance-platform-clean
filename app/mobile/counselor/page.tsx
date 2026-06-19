import { CounselorMobileApp } from "@/components/mobile/counselor-mobile-app";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function MobileCounselorPage() {
  const current = await requireDashboardUser();

  return (
    <CounselorMobileApp
      initialSection="home"
      userName={current.user.name || current.user.email || ""}
    />
  );
}