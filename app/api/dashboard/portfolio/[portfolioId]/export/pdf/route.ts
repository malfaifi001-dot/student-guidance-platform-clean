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

export async function GET(request: Request, { params }: { params: Promise<{ portfolioId: string }> }) {
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

    return responseWithPdf(pdf, pdfFileName(workspace.portfolio.title));
  } catch (error) {
    return portfolioApiError(error);
  }
}
