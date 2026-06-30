import { redirect } from "next/navigation";

import { AiReport2Workspace } from "@/components/ai-report2/ai-report2-workspace";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export default async function NewTeacherAiReport2Page() {
  const current = await getCurrentSessionUser();

  if (!current) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (current.user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  return <AiReport2Workspace />;
}