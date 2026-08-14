import { AdminGuidanceVideosCenter } from "@/components/guidance-videos/admin-guidance-videos-center";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminGuidanceVideosPage() {
  await requireAdminPage();
  return <AdminGuidanceVideosCenter />;
}
