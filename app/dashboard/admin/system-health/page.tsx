import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { AdminSystemHealthPage } from "@/components/admin/admin-system-health-page";

export default async function SystemHealthPage() {
  await requireAdminPage();

  return <AdminSystemHealthPage />;
}
