import { NextResponse } from "next/server";

import { requirePortfolioApiUser, portfolioApiError } from "@/lib/portfolio/portfolio-api";
import { createPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

export const dynamic = "force-dynamic";

function pdfFileName(title: string) {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return `${safe || "نسخة-ملف-الإنجاز"}.pdf`;
}

function responseWithPdf(pdf: Uint8Array, fileName: string) {
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="portfolio.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    const token = await createPortfolioExportToken(snapshot.document);
    const previewUrl = `${new URL(request.url).origin}/portfolio-export-preview/${encodeURIComponent(token)}?pdf=1`;
    const pdf = await generatePdfFromUrlWithCloudflare({
      url: previewUrl,
      waitForSelector: ".portfolio-page, .portfolio-report-page",
    });

    return responseWithPdf(pdf, pdfFileName(snapshot.name));
  } catch (error) {
    return portfolioApiError(error);
  }
}
