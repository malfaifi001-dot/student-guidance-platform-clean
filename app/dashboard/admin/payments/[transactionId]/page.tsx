import { AdminPaymentDetailPage } from "@/components/admin/payments/admin-payment-detail-page";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

type PageProps = {
  params: Promise<{
    transactionId: string;
  }>;
};

export default async function AdminPaymentDetailsPage({ params }: PageProps) {
  await requireAdminPage();

  const { transactionId } = await params;

  return <AdminPaymentDetailPage transactionId={transactionId} />;
}