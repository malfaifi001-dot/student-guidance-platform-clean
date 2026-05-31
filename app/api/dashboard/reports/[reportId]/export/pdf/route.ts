import { NextRequest } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    const { reportId } = await context.params;

    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    const previewUrl = new URL(
      `/dashboard/reports/${reportId}/preview`,
      origin
    );

    const template = requestUrl.searchParams.get("template");
    const evidenceLayout =
      requestUrl.searchParams.get("evidenceLayout") || "grid-2x2";
    const cover = requestUrl.searchParams.get("cover") || "true";
    const view = requestUrl.searchParams.get("view") || "mixed";

    if (template) {
      previewUrl.searchParams.set("template", template);
    }

    previewUrl.searchParams.set("evidenceLayout", evidenceLayout);
    previewUrl.searchParams.set("cover", cover);
    previewUrl.searchParams.set("view", view);
    previewUrl.searchParams.set("studio", "true");
    previewUrl.searchParams.set("pdf", "true");
    previewUrl.searchParams.set("v", String(Date.now()));

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({
      viewport: {
        width: 1240,
        height: 1754,
      },
      deviceScaleFactor: 1,
    });

    await page.emulateMedia({
      media: "print",
    });

    await page.goto(previewUrl.toString(), {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    await page.waitForSelector(".pdf-report-page", {
      timeout: 20_000,
    });

    await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll(".pdf-report-page"));

      const isolatedRoot = document.createElement("main");
      isolatedRoot.setAttribute("dir", "rtl");
      isolatedRoot.setAttribute("data-pdf-export", "isolated-report-pages");

      isolatedRoot.style.margin = "0";
      isolatedRoot.style.padding = "0";
      isolatedRoot.style.background = "#ffffff";
      isolatedRoot.style.width = "100%";

      pages.forEach((pageNode) => {
        isolatedRoot.appendChild(pageNode.cloneNode(true));
      });

      document.documentElement.style.margin = "0";
      document.documentElement.style.padding = "0";
      document.body.innerHTML = "";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.background = "#ffffff";
      document.body.appendChild(isolatedRoot);
    });

    await page.addStyleTag({
      content: `
        @page {
          size: A4;
          margin: 0;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box !important;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .no-print {
          display: none !important;
        }

        main {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        .pdf-report-page {
          display: block !important;
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
          margin: 0 auto !important;
          background: #ffffff !important;
          break-after: page !important;
          page-break-after: always !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        .pdf-report-page:last-child {
          break-after: auto !important;
          page-break-after: auto !important;
        }

        img {
          max-width: 100% !important;
        }
      `,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    await browser.close();
    browser = null;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="guidance-report-${reportId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }

    console.error("PDF export error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "تعذر تصدير التقرير بصيغة PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
