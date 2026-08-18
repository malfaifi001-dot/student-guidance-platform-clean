import { notFound } from "next/navigation";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { readPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";

export const dynamic = "force-dynamic";

export default async function PortfolioExportPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const payload = await readPortfolioExportToken((await params).token);
  if (!payload) notFound();

  return (
    <main dir="rtl">
      <PortfolioPrintDocument data={payload.document} />
    </main>
  );
}
