import { AdminInvoiceDetailPage } from "@/components/admin/payments/admin-invoice-detail-page";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

type PageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export default async function AdminInvoiceDetailRoutePage({ params }: PageProps) {
  await requireAdminPage();

  const { invoiceId } = await params;

  return <AdminInvoiceDetailPage invoiceId={invoiceId} />;
}