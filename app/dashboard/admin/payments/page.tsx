import { AdminPaymentsDashboard } from "@/components/admin/payments/admin-payments-dashboard";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminPaymentsPage() {
  await requireAdminPage();

  return <AdminPaymentsDashboard />;
}