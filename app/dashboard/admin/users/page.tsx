import { AdminUsersCommandCenter } from "@/components/admin/admin-users-command-center";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminUsersPage() {
  await requireAdminPage();

  return <AdminUsersCommandCenter />;
}
