import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { buildReportIdentityFromCurrentUser } from "@/lib/report-engine/report-identity-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRequestBody = {
  payload?: Record<string, unknown>;
  fileName?: string;
};

export async function POST(request: Request) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    const body = (await request.json()) as ExportRequestBody;

    const identityPayload = await resolveGuardianSummonsExportIdentity();
    const payload = { ...(body.payload || {}), ...identityPayload };
    const requestedFileName = ensurePdfExtension(
      body.fileName || "guardian-summons.pdf"
    );

    const host = request.headers.get("host") || "localhost:3000";
    const protocol =
      request.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");

    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    const previewUrl = `${protocol}://${host}/pdf-preview/guardian-summons?pdf=true&payload=${encodeURIComponent(
      encodedPayload
    )}`;

    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: {
        width: 794,
        height: 1123,
      },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    page.on("console", (message: any) => {
      if (message.type() === "error") {
        console.error(
          "GUARDIAN_SUMMONS_PDF_PREVIEW_CONSOLE_ERROR",
          message.text()
        );
      }
    });

    page.on("pageerror", (error: any) => {
      console.error("GUARDIAN_SUMMONS_PDF_PREVIEW_PAGE_ERROR", error);
    });

    const response = await page.goto(previewUrl, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });

    if (!response || !response.ok()) {
      const status = response?.status() || 0;
      throw new Error(`تعذر فتح صفحة معاينة PDF. status=${status}`);
    }

    const pageCount = await page.locator(".pdf-report-page").count();

    if (!pageCount) {
      throw new Error("لم يتم العثور على صفحة PDF داخل المعاينة.");
    }

    await page.emulateMedia({
      media: "print",
    });

    await page.evaluate(() => {
      document.documentElement.style.background = "#ffffff";
      document.documentElement.style.margin = "0";
      document.documentElement.style.padding = "0";

      document.body.style.background = "#ffffff";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.overflow = "hidden";

      const forbiddenSelectors = [
        "nav",
        "aside",
        "[data-sidebar]",
        "[data-dashboard-shell]",
        ".no-print",
        ".fixed",
        ".sticky",
      ];

      for (const selector of forbiddenSelectors) {
        document.querySelectorAll(selector).forEach((node: any) => {
          const element = node as HTMLElement;
          element.style.display = "none";
        });
      }

      const pages = Array.from(document.querySelectorAll(".pdf-report-page"));

      for (const pdfPage of pages) {
        const element = pdfPage as HTMLElement;

        element.style.background = "#ffffff";
        element.style.boxShadow = "none";
        element.style.border = "0";
        element.style.margin = "0 auto";
      }
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    await context.close();
    await browser.close();
    browser = null;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition(requestedFileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }

    console.error("GUARDIAN_SUMMONS_PDF_EXPORT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنشاء ملف PDF.",
      },
      {
        status: 500,
      }
    );
  }
}

async function resolveGuardianSummonsExportIdentity() {
  try {
    const currentSession = await getCurrentSessionUser();
    const identity = buildReportIdentityFromCurrentUser(
      currentSession?.user ?? null
    ) as any;

    return {
      ministryName: pickIdentityValue(identity.ministryName, "وزارة التعليم"),
      educationDepartment: pickIdentityValue(
        identity.educationDepartment,
        "الإدارة العامة للتعليم بمنطقة ................"
      ),
      educationOffice: pickIdentityValue(
        identity.educationOffice,
        "مكتب التعليم بمحافظة ................"
      ),
      schoolName: pickIdentityValue(
        identity.schoolName,
        "مدرسة ........................"
      ),
      academicYear: pickIdentityValue(identity.academicYear, "١٤٤٠ هـ / ١٤٣٩ هـ"),
      guidanceUnitName: pickIdentityValue(identity.guidanceUnitName || identity.guidanceDepartmentName, "الإرشاد الطلابي"),

      counselorName: pickIdentityValue(identity.counselorName, ""),
      counselorTitle: pickIdentityValue(identity.counselorTitle, ""),
      counselorGender: pickIdentityValue(
        identity.counselorGender || identity.guideGender || identity.advisorGender || identity.userGender || identity.gender,
        ""
      ),

      schoolLeaderName: pickIdentityValue(
        identity.principalName || identity.schoolLeaderName,
        ""
      ),
      principalName: pickIdentityValue(
        identity.principalName || identity.schoolLeaderName,
        ""
      ),
      schoolLeaderTitle: pickIdentityValue(
        identity.schoolLeaderTitle || identity.principalTitle,
        ""
      ),
      schoolLeaderGender: pickIdentityValue(
        identity.schoolLeaderGender || identity.principalGender || identity.leaderGender,
        ""
      ),

      ministryLogoUrl: "/uploads/school-logos/MOE.png",
      schoolLogoUrl: pickIdentityValue(identity.schoolLogoUrl, ""),
    };
  } catch (error) {
    console.error("GUARDIAN_SUMMONS_IDENTITY_RESOLVE_ERROR", error);

    return {
      ministryName: "وزارة التعليم",
      educationDepartment: "الإدارة العامة للتعليم بمنطقة ................",
      educationOffice: "مكتب التعليم بمحافظة ................",
      schoolName: "مدرسة ........................",
      academicYear: "١٤٤٠ هـ / ١٤٣٩ هـ",
      counselorName: "",
      counselorTitle: "الموجه/الموجهة الطلابية",
      schoolLeaderName: "",
      principalName: "",
      ministryLogoUrl: "/uploads/school-logos/MOE.png",
      schoolLogoUrl: "",
    };
  }
}

function pickIdentityValue(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const cleaned = value.trim();

  if (!cleaned || cleaned === "null" || cleaned === "undefined") {
    return fallback;
  }

  return cleaned;
}

function ensurePdfExtension(fileName: string) {
  const cleaned = fileName
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  return cleaned.endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function buildContentDisposition(fileName: string) {
  const asciiFallback = toAsciiFallback(fileName);
  const encodedFileName = encodeRFC5987ValueChars(fileName);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

function toAsciiFallback(fileName: string) {
  const fallback = fileName
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return fallback || "guardian-summons.pdf";
}

function encodeRFC5987ValueChars(value: string) {
  return encodeURIComponent(value)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
}


