import { AdminActivityCenter } from "@/components/admin/admin-activity-center";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";

export default async function AdminActivityPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminActivityCenter />;
}
