import { notFound } from "next/navigation";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { preparePortfolioDocumentForPdf, readPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";

export const dynamic = "force-dynamic";

export default async function PortfolioExportPreviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams?: Promise<{ pdf?: string }> }) {
  const token = (await params).token;
  const payload = await readPortfolioExportToken(token);
  if (!payload) notFound();
  const query = await searchParams;
  const document = query?.pdf === "1" ? preparePortfolioDocumentForPdf(payload.document, token) : payload.document;

  return (
    <main
      dir="rtl"
      data-portfolio-print-target="portfolio"
      data-portfolio-snapshot-id={payload.snapshotId || undefined}
    >
      <PortfolioPrintDocument data={document} />
    </main>
  );
}
