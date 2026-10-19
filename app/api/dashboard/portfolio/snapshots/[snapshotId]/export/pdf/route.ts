import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { assertPortfolioExportImageSourcesAvailable, createPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";
import { getPortfolioPublicOrigin } from "@/lib/portfolio/portfolio-public-origin";

export const runtime = "nodejs";
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
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    await assertPortfolioExportImageSourcesAvailable(snapshot.document);
    const token = await createPortfolioExportToken(snapshot.document);
    const previewUrl = `${getPortfolioPublicOrigin()}/portfolio-export-preview/${encodeURIComponent(token)}?pdf=1`;
    const pdf = await generatePdfFromUrlWithCloudflare({
      url: previewUrl,
      gotoWaitUntil: "domcontentloaded",
      waitForSelector: '[data-portfolio-pdf-ready="true"]',
      waitForSelectorTimeoutMs: 60_000,
      debugLabel: "portfolio",
    });

    return responseWithPdf(pdf, pdfFileName(snapshot.name));
  } catch (error) {
    return portfolioApiError(error);
  }
}
