import { AdminPaymentProvidersPage } from "@/components/admin/payments/admin-payment-providers-page";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminPaymentProvidersRoutePage() {
  await requireAdminPage();

  return <AdminPaymentProvidersPage />;
}