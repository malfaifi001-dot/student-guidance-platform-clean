import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { CustomReportServiceHome } from "@/components/custom-report/custom-report-service-home";

export default async function CustomReportPage() {
  const current = await getCurrentSessionUser();

  if (!current) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  return (
    <CustomReportServiceHome
      userName={current.user.officialName || current.user.name}
      userRole={current.user.role}
    />
  );
}