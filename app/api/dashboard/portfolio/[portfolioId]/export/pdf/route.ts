import { NextResponse } from "next/server";

import { requirePortfolioApiUser, portfolioApiError } from "@/lib/portfolio/portfolio-api";
import { getPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { getPortfolioRoutes } from "@/lib/portfolio/portfolio-routes";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

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

    const origin = new URL(request.url).origin;
    const printPath = getPortfolioRoutes(user.role).print;
    const previewUrl = `${origin}${printPath}?portfolioId=${encodeURIComponent(portfolioId)}&pdf=1`;
    const pdf = await generatePdfFromUrlWithCloudflare({
      request,
      url: previewUrl,
      waitForSelector: ".portfolio-page, .portfolio-report-page",
    });

    return responseWithPdf(pdf, pdfFileName(workspace.portfolio.title));
  } catch (error) {
    return portfolioApiError(error);
  }
}
