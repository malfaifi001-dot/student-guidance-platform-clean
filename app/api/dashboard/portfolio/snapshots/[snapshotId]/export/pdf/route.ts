import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { createPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import { getPortfolioPublicOrigin } from "@/lib/portfolio/portfolio-public-origin";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";
import { getPortfolioSnapshotPdfArtifact } from "@/lib/portfolio/portfolio-snapshot-pdf-service";
import { generatePdfStreamFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";
import { readStorageFile } from "@/lib/storage/storage-provider";
import { storageKeySegments } from "@/lib/storage/storage-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOWNLOAD_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,48}$/;

function pdfFileName(title: string) {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return `${safe || "portfolio"}.pdf`;
}

function getDownloadRequestId(request: Request) {
  const value = new URL(request.url).searchParams.get("downloadRequestId") || "";
  return DOWNLOAD_REQUEST_ID_PATTERN.test(value) ? value : "";
}

function pdfResponse(body: BodyInit, fileName: string, downloadRequestId: string, contentLength?: number | null) {
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="portfolio.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Cache-Control": "private, no-store",
    ...(contentLength !== undefined && contentLength !== null ? { "Content-Length": String(contentLength) } : {}),
  });
  if (downloadRequestId) {
    headers.set("Set-Cookie", `teachix_portfolio_download_${downloadRequestId}=1; Path=/; Max-Age=300; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  }
  return new Response(body as BodyInit, { headers });
}

export async function GET(request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    const fileName = pdfFileName(snapshot.name);
    const downloadRequestId = getDownloadRequestId(request);
    const artifact = await getPortfolioSnapshotPdfArtifact(snapshot.id, snapshot.document);

    if (artifact?.storageKey) {
      const body = await readStorageFile(storageKeySegments(artifact.storageKey));
      if (body.byteLength > 5 && Buffer.from(body.subarray(0, 5)).toString("ascii") === "%PDF-") {
        return pdfResponse(new Uint8Array(body), fileName, downloadRequestId, body.byteLength);
      }
    }

    const token = await createPortfolioExportToken(snapshot.document, { snapshotId: snapshot.id });
    const requestOrigin = new URL(request.url).origin;
    const fallbackUrl = `${requestOrigin}/portfolio-export-preview/${encodeURIComponent(token)}?pdf=1`;
    let origin: string;
    try {
      origin = getPortfolioPublicOrigin();
    } catch (error) {
      if (error instanceof Error && ["PORTFOLIO_PUBLIC_ORIGIN_NOT_CONFIGURED", "PORTFOLIO_PUBLIC_ORIGIN_NOT_REACHABLE"].includes(error.message)) {
        return NextResponse.json({
          ok: false,
          fallback: "PRINT_PREVIEW",
          previewUrl: fallbackUrl,
          message: "ملف PDF قيد التجهيز. افتح المعاينة المنفصلة للطباعة أو الحفظ.",
        }, { status: 409 });
      }
      throw error;
    }

    const previewUrl = `${origin}/portfolio-export-preview/${encodeURIComponent(token)}?pdf=1`;
    if (!previewUrl.startsWith(origin)) throw new Error("PORTFOLIO_EXPORT_ORIGIN_MISMATCH");

    const pdf = await generatePdfStreamFromUrlWithCloudflare({
      request,
      url: previewUrl,
      gotoWaitUntil: "domcontentloaded",
      waitForSelector: '[data-portfolio-pdf-ready="true"]',
      waitForSelectorTimeoutMs: 60_000,
      debugLabel: "portfolio",
    });
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="portfolio.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    });
    if (pdf.contentLength !== null) headers.set("Content-Length", String(pdf.contentLength));
    if (downloadRequestId) headers.set("Set-Cookie", `teachix_portfolio_download_${downloadRequestId}=1; Path=/; Max-Age=300; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return new Response(pdf.body, { headers });
  } catch (error) {
    return portfolioApiError(error);
  }
}
