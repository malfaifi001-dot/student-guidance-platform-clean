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
    const currentSession = await getCurrentSessionUser();

    if (!currentSession?.user) {
      return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
    }

    const body = (await request.json()) as ExportRequestBody;
    const identityPayload = buildIdentityPayload(currentSession.user);

    const payload = {
      ...(body.payload || {}),
      ...identityPayload,
    };

    const requestedFileName = ensurePdfExtension(
      body.fileName || "appreciation-certificate.pdf"
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

    const previewUrl = `${protocol}://${host}/pdf-preview/appreciation-certificate?pdf=true&payload=${encodeURIComponent(
      encodedPayload
    )}`;

    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: { width: 1123, height: 794 },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    page.on("console", (message: any) => {
      if (message.type() === "error") {
        console.error(
          "APPRECIATION_CERTIFICATE_PDF_CONSOLE_ERROR",
          message.text()
        );
      }
    });

    page.on("pageerror", (error: any) =>
      console.error("APPRECIATION_CERTIFICATE_PDF_PAGE_ERROR", error)
    );

    const response = await page.goto(previewUrl, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });

    if (!response || !response.ok()) {
      throw new Error(
        `تعذر فتح معاينة شهادة الشكر. status=${response?.status() || 0}`
      );
    }

    const pageCount = await page.locator(".pdf-certificate-page").count();

    if (!pageCount) {
      throw new Error("لم يتم العثور على صفحة شهادة الشكر داخل المعاينة.");
    }

    await page.emulateMedia({ media: "print" });

    await page.evaluate(() => {
      document.documentElement.style.background = "#ffffff";
      document.body.style.background = "#ffffff";
      document.body.style.margin = "0";
      document.body.style.padding = "0";

      document
        .querySelectorAll("header, nav, aside, .no-print, .fixed, .sticky")
        .forEach((node: any) => {
          (node as HTMLElement).style.display = "none";
        });

      document.querySelectorAll(".pdf-certificate-page").forEach((node: any) => {
        const element = node as HTMLElement;
        element.style.boxShadow = "none";
        element.style.border = "0";
        element.style.margin = "0";
      });
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
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
    if (browser) await browser.close().catch(() => {});

    console.error("APPRECIATION_CERTIFICATE_PDF_EXPORT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تصدير شهادة الشكر.",
      },
      { status: 500 }
    );
  }
}

function buildIdentityPayload(user: unknown) {
  const identity = buildReportIdentityFromCurrentUser(user as Parameters<typeof buildReportIdentityFromCurrentUser>[0]) as any;

  return {
    ministryName: pickIdentityValue(identity.ministryName, "وزارة التعليم"),
    educationDepartment: pickIdentityValue(identity.educationDepartment, ""),
    educationOffice: pickIdentityValue(identity.educationOffice, ""),
    schoolName: pickIdentityValue(identity.schoolName, ""),
    academicYear: pickIdentityValue(identity.academicYear, ""),

    counselorName: pickIdentityValue(identity.counselorName, ""),
    counselorTitle: pickIdentityValue(identity.counselorTitle, ""),
    counselorGender: pickIdentityValue(
      identity.counselorGender ||
        identity.guideGender ||
        identity.advisorGender ||
        identity.userGender ||
        identity.gender,
      ""
    ),

    schoolLeaderName: pickIdentityValue(
      identity.schoolLeaderName || identity.principalName,
      ""
    ),
    schoolLeaderTitle: pickIdentityValue(
      identity.schoolLeaderTitle || identity.principalTitle,
      ""
    ),
    schoolLeaderGender: pickIdentityValue(
      identity.schoolLeaderGender ||
        identity.principalGender ||
        identity.leaderGender,
      ""
    ),

    ministryLogoUrl: "/uploads/school-logos/MOE.png",
    schoolLogoUrl: pickIdentityValue(identity.schoolLogoUrl, ""),
  };
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

  return fallback || "appreciation-certificate.pdf";
}

function encodeRFC5987ValueChars(value: string) {
  return encodeURIComponent(value)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
}

