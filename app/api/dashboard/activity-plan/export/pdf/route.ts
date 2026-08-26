import { NextResponse } from "next/server";
import { requireServiceAccessForCurrentUser } from "@/bin/require-auth";
import { getRequestOrigin } from "@/lib/http/request-origin";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

export const runtime = "nodejs";

function safeFileName(value: unknown) {
  const name = String(value || "student-activity-plan.pdf").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 150);
  return name.endsWith(".pdf") ? name : `${name || "student-activity-plan"}.pdf`;
}

function contentDisposition(fileName: string) {
  const asciiFallback = fileName.normalize("NFKD").replace(/[^\x20-\x7E]+/g, "-").replace(/["\\]/g, "-").replace(/-+/g, "-") || "student-activity-plan.pdf";
  const encodedFileName = encodeURIComponent(fileName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

export async function POST(request: Request) {
  const context = await requireServiceAccessForCurrentUser("student-activity-plan");
  if (context instanceof Response) return context;
  if (!context.isAdmin && context.user.role !== "ACTIVITY_LEADER") return NextResponse.json({ success: false, error: "هذه الخدمة متاحة لرائد النشاط فقط." }, { status: 403 });

  let body: { fileName?: unknown; stage?: unknown; weeks?: unknown } = {};
  try { body = (await request.json()) as typeof body; } catch { /* optional body */ }

  const origin = getRequestOrigin(request);
  const printUrl = new URL("/print/activity-plan", origin);
  printUrl.searchParams.set("print", "1");
  if (typeof body.stage === "string" && body.stage.trim()) printUrl.searchParams.set("stage", body.stage.trim());
  if (Array.isArray(body.weeks)) {
    const weeks = body.weeks.map((week) => Number(week)).filter((week) => Number.isInteger(week) && week >= 1 && week <= 20);
    if (weeks.length) printUrl.searchParams.set("weeks", Array.from(new Set(weeks)).join(","));
  }

  try {
    const pdfBytes = await generatePdfFromUrlWithCloudflare({ request, url: printUrl.toString(), waitForSelector: ".activity-plan-print-page", landscape: true });
    const pdfBody = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    return new Response(pdfBody, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": contentDisposition(safeFileName(body.fileName)), "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Activity plan Cloudflare PDF export failed.", { message: error instanceof Error ? error.message : "Unknown PDF export error" });
    return NextResponse.json({ fallback: "PRINT_PREVIEW", previewUrl: printUrl.pathname + printUrl.search, fileName: safeFileName(body.fileName) }, { status: 503 });
  }
}
