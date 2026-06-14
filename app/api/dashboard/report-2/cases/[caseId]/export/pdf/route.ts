import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

type ExportPdfBody = {
  fileName?: string;
  snapshot?: unknown;
};

function getReportTwoExportSnapshotDir() {
  return path.join(process.cwd(), ".tmp", "report-2-export");
}

function safeDownloadFileName(value: unknown) {
  const name = String(value || "report.pdf")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);

  return name.endsWith(".pdf") ? name : `${name || "report"}.pdf`;
}

function buildContentDisposition(fileName: string) {
  const safeName = safeDownloadFileName(fileName);
  const encoded = encodeURIComponent(safeName);

  return `attachment; filename="report.pdf"; filename*=UTF-8''${encoded}`;
}

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http";

  return `${proto}://${host}`;
}

async function readBody(request: Request): Promise<ExportPdfBody> {
  try {
    return (await request.json()) as ExportPdfBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request, context: RouteContext) {
  const current = await requireDashboardUser();
  const { caseId } = await context.params;

  const access = await buildSmartReportPayloadForCase({
    caseId,
    current,
  });

  if (!access.ok) {
    return NextResponse.json(
      {
        error: "لا تملك صلاحية تصدير هذا التقرير أو أن الحالة غير موجودة.",
      },
      {
        status: access.status || 404,
      },
    );
  }

  const body = await readBody(request);
  const snapshot = body.snapshot as any;

  if (!snapshot?.template?.pages?.length) {
    return NextResponse.json(
      {
        error: "بيانات التقرير غير جاهزة للتصدير.",
      },
      {
        status: 400,
      },
    );
  }

  const token = crypto.randomUUID();
  const snapshotDir = getReportTwoExportSnapshotDir();
  const snapshotPath = path.join(snapshotDir, `${token}.json`);
  const origin = getRequestOrigin(request);
  const previewUrl = `${origin}/report-2-export-preview/${token}`;
  const printPreviewUrl = `${previewUrl}?print=1`;
  const fileName = safeDownloadFileName(body.fileName || "report.pdf");

  await fs.mkdir(snapshotDir, {
    recursive: true,
  });

  await fs.writeFile(snapshotPath, JSON.stringify(snapshot), "utf8");

  let browser: any = null;

  try {
    const runtimeImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<typeof import("puppeteer")>;

    const puppeteerModule = await runtimeImport("puppeteer");
    const puppeteer = puppeteerModule.default || puppeteerModule;

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.emulateMediaFeatures([
      {
        name: "prefers-color-scheme",
        value: "light",
      },
    ]);

    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1,
    });

    await page.goto(previewUrl, {
      waitUntil: "load",
    });

    await page.waitForSelector(
      ".pdf-report-page, [data-report-design-page], .report-design-page",
      {
        timeout: 30000,
      },
    );

    await page.evaluate(async () => {
      const fonts = (document as any).fonts;

      if (fonts?.ready) {
        await fonts.ready;
      }
    });

    await page.addStyleTag({
      content: `
        @page {
          size: A4;
          margin: 0;
        }

        :root,
        html,
        body,
        main {
          color-scheme: light !important;
        }

        .report-two-force-light-export {
          color-scheme: light !important;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          min-height: 297mm !important;
          background: #ffffff !important;
          overflow: visible !important;
        }

        .pdf-report-page,
        [data-report-design-page],
        .report-design-page {
          width: 210mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          margin: 0 !important;
          box-shadow: none !important;
          transform: none !important;
          zoom: 1 !important;
          overflow: hidden !important;
          break-after: page !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
        }

        .pdf-report-page:last-child,
        [data-report-design-page]:last-child,
        .report-design-page:last-child {
          break-after: auto !important;
          page-break-after: auto !important;
        }

        [data-report-two-pdf-hide="evidence-overflow-note"] {
          display: none !important;
        }
      `,
    });

    const pageCount = await page.evaluate(() => {
      const selectors = [
        ".pdf-report-page",
        "[data-report-design-page]",
        ".report-design-page",
      ];

      const pages = Array.from(
        new Set(
          selectors.flatMap((selector) =>
            Array.from(document.querySelectorAll<HTMLElement>(selector)),
          ),
        ),
      ).filter((item) => {
        const rect = item.getBoundingClientRect();

        return rect.width > 100 && rect.height > 100;
      });

      const main = document.createElement("main");

      main.setAttribute("dir", "rtl");
      main.style.width = "210mm";
      main.style.margin = "0";
      main.style.padding = "0";
      main.style.background = "#ffffff";

      pages.forEach((item) => {
        main.appendChild(item.cloneNode(true));
      });

      document.body.replaceChildren(main);

      return pages.length;
    });

    if (!pageCount) {
      return NextResponse.json(
        {
          error: "لم يتم العثور على صفحات A4 داخل المعاينة.",
        },
        {
          status: 400,
        },
      );
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    const pdfBuffer = Buffer.from(pdf);

    await fs.unlink(snapshotPath).catch(() => null);

    return new Response(toArrayBuffer(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Report-2 PDF generation failed, falling back to print preview:", error);

    return NextResponse.json(
      {
        fallback: "PRINT_PREVIEW",
        previewUrl: printPreviewUrl,
        fileName,
        message:
          "Server PDF generation failed. Opening print preview so the user can save as PDF.",
      },
      {
        status: 200,
      },
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}