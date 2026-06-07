import { AdminActivationsCenter } from "@/components/activation/admin-activations-center";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";

export default async function AdminActivationsPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminActivationsCenter />;
}
