import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { getReportAccess } from "@/lib/reports/report-access";

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
    `${url.protocol}//${url.host}`
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

  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (!authResult.isAdmin && !authResult.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم ربط الحساب بمدرسة.",
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 }
    );
  }

  try {
    const { reportId } = await context.params;
    const reportAccess = await getReportAccess(reportId, {
      schoolAccountId: authResult.schoolAccountId,
      isAdmin: authResult.isAdmin,
      userId: authResult.user.id,
      userRole: authResult.user.role,
      historicalPersonalRead: true,
    });

    if (!reportAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "التقارير غير موجود أو لا تملك صلاحية الوصول إليه.",
        },
        { status: 404 }
      );
    }

    const requestUrl = new URL(request.url);
    const baseUrl = getBaseUrl(request);
    const searchParams = copySearchParams(requestUrl.searchParams);

    const previewUrl = `${baseUrl}/dashboard/reports/${reportId}/preview?${searchParams.toString()}`;
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

    page.on("console", (message: any) => {
      const text = message.text();

      if (message.type() === "error") {
        console.error("PDF_PREVIEW_CONSOLE_ERROR", text);
      }
    });

    page.on("pageerror", (error: any) => {
      console.error("PDF_PREVIEW_PAGE_ERROR", error);
    });

    const response = await page.goto(previewUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    if (!response || !response.ok()) {
      const status = response?.status() || 0;

      throw new Error(
        `تعذر فتح صفحة المعاينة الداخلية. Status: ${status}. URL: ${previewUrl}`
      );
    }

    await page.waitForLoadState("networkidle", {
      timeout: 45_000,
    }).catch(() => null);

    await page.addStyleTag({
      content: `
        /* PDF_PAGE_GUARD_STYLE */
        @page {
          size: A4;
          margin: 0;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          background: #ffffff !important;
          overflow: visible !important;
        }

        .pdf-report-page {
          width: 210mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          break-after: page !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
          box-shadow: none !important;
          transform: none !important;
        }

        .pdf-report-page:last-child {
          break-after: auto !important;
          page-break-after: auto !important;
        }

        .pdf-report-page *,
        .pdf-report-page *::before,
        .pdf-report-page *::after {
          box-sizing: border-box !important;
        }
      `,
    });
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
          "لم يتم العثور على صفحة التقارير داخل المعاينة.",
          `Current URL: ${currentUrl}`,
          `Title: ${title || "بدون عنوان"}`,
          `Body: ${bodyText.slice(0, 300)}`,
        ].join("\n")
      );
    }

    await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll(".pdf-report-page"));

      if (!pages.length) return;

      document.documentElement.style.margin = "0";
      document.documentElement.style.padding = "0";
      document.documentElement.style.width = "210mm";
      document.documentElement.style.background = "white";

      document.body.innerHTML = "";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.width = "210mm";
      document.body.style.background = "white";
      document.body.style.overflow = "visible";

      const root = document.createElement("main");
      root.style.margin = "0";
      root.style.padding = "0";
      root.style.width = "210mm";
      root.style.background = "white";

      pages.forEach((reportPage, index) => {
        const clonedPage = reportPage.cloneNode(true) as HTMLElement;

        clonedPage.style.width = "210mm";
        clonedPage.style.minWidth = "210mm";
        clonedPage.style.maxWidth = "210mm";
        clonedPage.style.height = "297mm";
        clonedPage.style.minHeight = "297mm";
        clonedPage.style.maxHeight = "297mm";
        clonedPage.style.margin = "0";
        clonedPage.style.boxSizing = "border-box";
        clonedPage.style.overflow = "hidden";
        clonedPage.style.boxShadow = "none";
        clonedPage.style.breakAfter = index === pages.length - 1 ? "auto" : "page";
        clonedPage.style.pageBreakAfter = index === pages.length - 1 ? "auto" : "always";
        clonedPage.style.pageBreakInside = "avoid";

        root.appendChild(clonedPage);
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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="guidance-report-${reportId}.pdf"`,
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
