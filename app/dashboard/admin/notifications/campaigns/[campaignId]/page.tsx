import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { AdminPushCampaignDetails } from "@/components/admin/notifications/admin-push-campaign-details";

export default async function AdminPushCampaignDetailsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  await requireAdminPage();
  const { campaignId } = await params;
  return <AdminPushCampaignDetails campaignId={campaignId} />;
}
