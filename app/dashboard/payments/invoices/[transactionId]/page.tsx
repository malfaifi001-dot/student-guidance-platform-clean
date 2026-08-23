import { TeachixInvoicePreviewPage } from "@/components/payments/teachix-invoice-preview-page";

type PageProps = {
  params: Promise<{ transactionId: string }>;
};

export default async function InvoicePreviewPage({ params }: PageProps) {
  const { transactionId } = await params;
  return <TeachixInvoicePreviewPage transactionId={transactionId} />;
}
