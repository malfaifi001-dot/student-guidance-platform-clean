import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { AdminUserWhatsAppCenter } from "@/components/admin/admin-user-whatsapp-center";

export default async function AdminUserWhatsAppPage() {
  await requireAdminPage();
  return <AdminUserWhatsAppCenter />;
}
