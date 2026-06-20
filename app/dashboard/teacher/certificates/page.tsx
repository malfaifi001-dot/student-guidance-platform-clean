import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function TeacherCertificatesRedirectPage() {
  await requireDashboardUser();

  redirect("/dashboard/certificates");
}