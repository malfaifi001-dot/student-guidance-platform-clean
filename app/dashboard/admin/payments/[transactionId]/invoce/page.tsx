import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    transactionId: string;
  }>;
};

export default async function AdminPaymentInvoiceTypoRedirectPage({ params }: PageProps) {
  const { transactionId } = await params;

  redirect(`/dashboard/admin/payments/${transactionId}/invoice`);
}