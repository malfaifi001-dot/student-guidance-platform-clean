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

    return new Response(pdf.body, { headers });
  } catch (error) {
    return portfolioApiError(error);
  }
}
