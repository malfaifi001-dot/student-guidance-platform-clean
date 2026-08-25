import { NextResponse } from "next/server";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getRequestOrigin } from "@/lib/http/request-origin";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ analysisId: string }>;
};

function safeDownloadFileName(value: unknown) {
  const name = String(value || "تحليل نتائج")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);

  return name.endsWith(".pdf") ? name : `${name || "تحليل نتائج"}.pdf`;
}

function getPdfContentDisposition(fileName: string) {
  const asciiFallback = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, "-")
    .replace(/["\\]/g, "-")
    .replace(/-+/g, "-") || "assessment-analysis.pdf";
  const encodedFileName = encodeURIComponent(fileName).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireSchoolDashboardApiContext();
  if (auth instanceof Response) return auth;

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  const { analysisId } = await context.params;
  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: {
      id: analysisId,
      schoolAccountId: auth.schoolAccountId,
      uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] },
    },
    select: { id: true, title: true },
  });

  if (!analysis) {
    return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
  }

  const origin = getRequestOrigin(request);
  const printUrl = `${origin}/assessments-center-print/${encodeURIComponent(analysis.id)}?print=1`;
  const fileName = safeDownloadFileName(analysis.title);

  try {
    const pdfBytes = await generatePdfFromUrlWithCloudflare({
      request,
      url: printUrl,
      waitForSelector: ".report-page",
    });
    const pdfBody = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;

    return new Response(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": getPdfContentDisposition(fileName),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Assessments-center Cloudflare PDF export failed.", {
      analysisId: analysis.id,
      message: error instanceof Error ? error.message : "Unknown PDF export error",
    });

    return NextResponse.json({
      fallback: "PRINT_PREVIEW",
      previewUrl: `/assessments-center-print/${encodeURIComponent(analysis.id)}?print=1`,
    });
  }
}
