import { AdminPaymentInvoicePage } from "@/components/admin/payments/admin-payment-invoice-page";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

type PageProps = {
  params: Promise<{
    transactionId: string;
  }>;
};

export default async function AdminPaymentInvoiceRoutePage({ params }: PageProps) {
  await requireAdminPage();

  const { transactionId } = await params;

  return <AdminPaymentInvoicePage transactionId={transactionId} />;
}