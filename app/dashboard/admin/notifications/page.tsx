import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { AdminPushCenter } from "@/components/admin/notifications/admin-push-center";

export default async function AdminNotificationsPage() {
  await requireAdminPage();
  return <AdminPushCenter />;
}
