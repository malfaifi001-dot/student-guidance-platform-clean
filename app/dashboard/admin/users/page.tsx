import { AdminUsersCommandCenter } from "@/components/admin/admin-users-command-center";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminUsersCommandCenter />;
}
