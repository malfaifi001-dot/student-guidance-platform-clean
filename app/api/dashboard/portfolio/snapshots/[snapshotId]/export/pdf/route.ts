import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { getPortfolioRoutes } from "@/lib/portfolio/portfolio-routes";
import { getPortfolioPublicOrigin } from "@/lib/portfolio/portfolio-public-origin";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";
import { generatePdfStreamFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pdfFileName(title: string) {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return `${safe || "نسخة-ملف-الإنجاز"}.pdf`;
}

const DOWNLOAD_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,48}$/;

function getDownloadRequestId(request: Request) {
  const value = new URL(request.url).searchParams.get("downloadRequestId") || "";
  return DOWNLOAD_REQUEST_ID_PATTERN.test(value) ? value : "";
}

export async function GET(request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    const origin = getPortfolioPublicOrigin();
    const snapshotPath = `${getPortfolioRoutes(user.role).snapshots}/${encodeURIComponent(snapshotId)}`;
    const previewUrl = `${origin}${snapshotPath}?pdf=1`;
    const pdf = await generatePdfStreamFromUrlWithCloudflare({
      request,
      url: previewUrl,
      waitForSelector: ".portfolio-page, .portfolio-report-page",
    });

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="portfolio.pdf"; filename*=UTF-8''${encodeURIComponent(pdfFileName(snapshot.name))}`,
      "Cache-Control": "private, no-store",
    });
    if (pdf.contentLength !== null) {
      headers.set("Content-Length", String(pdf.contentLength));
    }
    const downloadRequestId = getDownloadRequestId(request);
    if (downloadRequestId) {
      headers.set(
        "Set-Cookie",
        `teachix_portfolio_download_${downloadRequestId}=1; Path=/; Max-Age=300; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      );
    }

    return new Response(pdf.body, { headers });
  } catch (error) {
    return portfolioApiError(error);
  }
}
