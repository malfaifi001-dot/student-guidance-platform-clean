import { redirect } from "next/navigation";

import { AiReportServiceHome } from "@/components/ai-report/ai-report-service-home";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export default async function AiReportPage() {
  const current = await getCurrentSessionUser();

  if (!current) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  return (
    <AiReportServiceHome
      userName={current.user.officialName || current.user.name || ""}
      userId={current.user.id}
      schoolAccountId={current.user.schoolAccountId}
    />
  );
}