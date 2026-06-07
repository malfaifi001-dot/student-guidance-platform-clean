import { AdminInvoiceSettingsPage } from "@/components/admin/payments/admin-invoice-settings-page";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminInvoiceSettingsRoutePage() {
  await requireAdminPage();

  return <AdminInvoiceSettingsPage />;
}