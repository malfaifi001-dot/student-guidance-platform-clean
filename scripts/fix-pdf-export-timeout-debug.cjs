const fs = require("fs");

const path = "app/api/dashboard/reports/[reportId]/export/pdf/route.ts";
let content = fs.readFileSync(path, "utf8");

const start = content.indexOf("import");
if (start === -1) {
  throw new Error("ملف PDF export غير واضح.");
}

const newContent = `import { NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

function getBaseUrl(request: Request) {
  const url = new URL(request.url);

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    \`\${url.protocol}//\${url.host}\`
  );
}

function copySearchParams(source: URLSearchParams) {
  const target = new URLSearchParams();

  for (const [key, value] of source.entries()) {
    if (key !== "inline") {
      target.set(key, value);
    }
  }

  target.set("pdf", "true");
  target.set("studio", "true");

  return target;
}

export async function GET(request: Request, context: RouteContext) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    const { reportId } = await context.params;
    const requestUrl = new URL(request.url);
    const baseUrl = getBaseUrl(request);
    const searchParams = copySearchParams(requestUrl.searchParams);

    const previewUrl = \`\${baseUrl}/dashboard/reports/\${reportId}/preview?\${searchParams.toString()}\`;
    const cookieHeader = request.headers.get("cookie") || "";

    browser = await chromium.launch({
      headless: true,
    });

    const browserContext = await browser.newContext({
      viewport: {
        width: 1280,
        height: 1600,
      },
      extraHTTPHeaders: cookieHeader
        ? {
            cookie: cookieHeader,
          }
        : undefined,
    });

    const page = await browserContext.newPage();

    page.on("console", (message) => {
      const text = message.text();

      if (message.type() === "error") {
        console.error("PDF_PREVIEW_CONSOLE_ERROR", text);
      }
    });

    page.on("pageerror", (error) => {
      console.error("PDF_PREVIEW_PAGE_ERROR", error);
    });

    const response = await page.goto(previewUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    if (!response || !response.ok()) {
      const status = response?.status() || 0;

      throw new Error(
        \`تعذر فتح صفحة المعاينة الداخلية. Status: \${status}. URL: \${previewUrl}\`
      );
    }

    await page.waitForLoadState("networkidle", {
      timeout: 45_000,
    }).catch(() => null);

    const hasReportPage = await page
      .locator(".pdf-report-page")
      .first()
      .isVisible({
        timeout: 45_000,
      })
      .catch(() => false);

    if (!hasReportPage) {
      const currentUrl = page.url();
      const title = await page.title().catch(() => "");
      const bodyText = await page
        .locator("body")
        .innerText({
          timeout: 5_000,
        })
        .catch(() => "");

      console.error("PDF_EXPORT_NO_REPORT_PAGE", {
        previewUrl,
        currentUrl,
        title,
        bodyText: bodyText.slice(0, 1500),
      });

      throw new Error(
        [
          "لم يتم العثور على صفحة التقرير داخل المعاينة.",
          \`Current URL: \${currentUrl}\`,
          \`Title: \${title || "بدون عنوان"}\`,
          \`Body: \${bodyText.slice(0, 300)}\`,
        ].join("\\n")
      );
    }

    await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll(".pdf-report-page"));

      if (!pages.length) return;

      document.body.innerHTML = "";

      const root = document.createElement("main");
      root.style.margin = "0";
      root.style.padding = "0";
      root.style.background = "white";

      pages.forEach((reportPage) => {
        root.appendChild(reportPage.cloneNode(true));
      });

      document.body.appendChild(root);
    });

    const pdfBuffer = await page.pdf({
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

    await browserContext.close();

    const inline = requestUrl.searchParams.get("inline") === "true";

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": \`\${inline ? "inline" : "attachment"}; filename="guidance-report-\${reportId}.pdf"\`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("REPORT_PDF_EXPORT_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تصدير PDF.",
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}
`;

fs.writeFileSync(path, newContent, "utf8");

console.log("تم استبدال PDF export route بنسخة أقوى مع تشخيص واضح.");
