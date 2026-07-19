import { AdminReferenceLibraryCenter } from "@/components/reference-library/admin-reference-library-center";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { ensureDefaultPlatformServices } from "@/lib/services/default-platform-services";

export default async function AdminCounselorReferenceLibraryPage() {
  await requireAdminPage();
  await ensureDefaultPlatformServices();

  return <AdminReferenceLibraryCenter />;
}