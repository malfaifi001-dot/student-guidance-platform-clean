import { AdminInvoicesDashboard } from "@/components/admin/payments/admin-invoices-dashboard";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminPaymentInvoicesPage() {
  await requireAdminPage();

  return <AdminInvoicesDashboard />;
}