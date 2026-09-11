import { NextResponse } from "next/server";

import { requirePortfolioApiUser, portfolioApiError } from "@/lib/portfolio/portfolio-api";
import { getPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { createPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";
import { getRequestOrigin } from "@/lib/http/request-origin";

export const dynamic = "force-dynamic";

function pdfFileName(title: string) {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return `${safe || "ملف-الإنجاز"}.pdf`;
}

const DOWNLOAD_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,48}$/;

function portfolioDownloadDebug(stage: string, details: Record<string, unknown>) {
  console.info("PORTFOLIO_DOWNLOAD_DEBUG", { stage, ...details });
}

function getDownloadRequestId(request: Request) {
  const value = new URL(request.url).searchParams.get("downloadRequestId") || "";
  return DOWNLOAD_REQUEST_ID_PATTERN.test(value) ? value : "";
}

function responseWithPdf(
  pdf: Uint8Array,
  fileName: string,
  downloadRequestId: string,
  elapsedMs: number,
) {
  portfolioDownloadDebug("response-build-start", { elapsedMs, bytesLength: pdf.byteLength });
  // Cloudflare returns a full Uint8Array view. Reuse its ArrayBuffer instead of
  // slicing a second ~23 MB buffer; retain a safe fallback for non-full views.
  const body = pdf.byteOffset === 0 && pdf.byteLength === pdf.buffer.byteLength
    ? pdf.buffer as ArrayBuffer
    : pdf.slice().buffer as ArrayBuffer;
  const response = new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="portfolio.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(pdf.byteLength),
    },
  });

  if (downloadRequestId) {
    response.cookies.set({
      name: `teachix_portfolio_download_${downloadRequestId}`,
      value: "1",
      path: "/",
      maxAge: 120,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
  }

  portfolioDownloadDebug("response-build-finished", {
    elapsedMs,
    bytesLength: pdf.byteLength,
    contentType: "application/pdf",
    contentDispositionPresent: true,
    downloadRequestIdPresent: Boolean(downloadRequestId),
  });
  portfolioDownloadDebug("response-return", { elapsedMs, bytesLength: pdf.byteLength });
  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ portfolioId: string }> }) {
  const startedAt = Date.now();
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId } = await params;
    const workspace = await getPortfolioWorkspace(user, portfolioId);
    if (!workspace.ok) {
      return NextResponse.json({ ok: false, error: "ملف الإنجاز غير متاح." }, { status: 404 });
    }

    const { ok: _ok, routes: _routes, ...document } = workspace;
    const token = await createPortfolioExportToken(document as PortfolioPrintData);
    const previewUrl = `${getRequestOrigin(request)}/portfolio-export-preview/${encodeURIComponent(token)}?pdf=1`;
    console.info("PORTFOLIO_CLOUDFLARE_DEBUG", {
      stage: "export-route",
      previewPath: "/portfolio-export-preview/[token]?pdf=1",
    });
    const pdf = await generatePdfFromUrlWithCloudflare({
      url: previewUrl,
      gotoWaitUntil: "domcontentloaded",
      waitForSelector: '[data-portfolio-pdf-ready="true"]',
      waitForSelectorTimeoutMs: 30_000,
      debugLabel: "portfolio",
    });
    const downloadRequestId = getDownloadRequestId(request);
    const elapsedMs = Date.now() - startedAt;
    portfolioDownloadDebug("route-pdf-ready", {
      elapsedMs,
      bytesLength: pdf.byteLength,
      downloadRequestIdPresent: Boolean(downloadRequestId),
    });

    return responseWithPdf(
      pdf,
      pdfFileName(workspace.portfolio.title),
      downloadRequestId,
      elapsedMs,
    );
  } catch (error) {
    portfolioDownloadDebug("export-error", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      safeCode:
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "PORTFOLIO_EXPORT_FAILED",
      elapsedMs: Date.now() - startedAt,
    });
    return portfolioApiError(error);
  }
}
