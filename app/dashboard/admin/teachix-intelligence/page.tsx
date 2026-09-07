import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { TeachixIntelligencePage } from "@/components/admin/teachix-intelligence-page";

export default async function Page() {
  await requireAdminPage();
  return <TeachixIntelligencePage />;
}
