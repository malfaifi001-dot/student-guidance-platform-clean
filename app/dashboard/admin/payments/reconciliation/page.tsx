import { AdminPaymentReconciliationPage } from "@/components/admin/payments/admin-payment-reconciliation-page";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminPaymentReconciliationRoutePage() {
  await requireAdminPage();

  return <AdminPaymentReconciliationPage />;
}