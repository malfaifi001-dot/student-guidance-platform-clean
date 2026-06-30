import { redirect } from "next/navigation";

import { AiReportWorkspace } from "@/components/ai-report/ai-report-workspace";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export default async function NewAiReportPage() {
  const current = await getCurrentSessionUser();

  if (!current) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  return <AiReportWorkspace />;
}