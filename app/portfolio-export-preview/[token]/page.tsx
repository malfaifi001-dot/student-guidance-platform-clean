import { notFound } from "next/navigation";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { PortfolioPrintPreviewController } from "@/components/portfolio/print/portfolio-print-preview-controller";
import { preparePortfolioDocumentForPdf, readPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";

export const dynamic = "force-dynamic";

export default async function PortfolioExportPreviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams?: Promise<{ pdf?: string; print?: string; ios?: string }> }) {
  const token = (await params).token;
  const payload = await readPortfolioExportToken(token);
  if (!payload) notFound();
  const query = await searchParams;
  const document = query?.pdf === "1" ? preparePortfolioDocumentForPdf(payload.document, token) : payload.document;
  const printMode = query?.print === "1";
  const iosPrintMode = printMode && query?.ios === "1";

  return (
    <main
      dir="rtl"
      data-portfolio-print-target="portfolio"
      data-portfolio-snapshot-id={payload.snapshotId || undefined}
    >
      {printMode ? (
        <PortfolioPrintPreviewController
          autoPrint={!iosPrintMode}
          manualPrintOnly={iosPrintMode}
          downloadUrl={payload.snapshotId ? `/api/dashboard/portfolio/snapshots/${encodeURIComponent(payload.snapshotId)}/export/pdf` : undefined}
        />
      ) : null}
      <PortfolioPrintDocument data={document} />
    </main>
  );
}
