import { redirect } from "next/navigation";
import { AdminPromotionsPage } from "@/components/promotions/admin-promotions-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function PromotionsPage() {
  const current = await requireDashboardUser();
  if (current.user.role !== "ADMIN") redirect("/dashboard");
  return <AdminPromotionsPage />;
}

