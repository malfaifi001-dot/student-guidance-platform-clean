import { NextResponse } from "next/server";
import { requireServiceAccessForCurrentUser } from "@/bin/require-auth";
import { getRequestOrigin } from "@/lib/http/request-origin";
import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { listTeacherSavedCurriculum } from "@/lib/curriculum-distribution/my-curriculum";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

export const runtime = "nodejs";

function safeFileName(value: unknown, fallback: string) {
  const requested = String(value || "").trim();
  const source = requested && !/[\u00d9\u00d8]/.test(requested) ? requested : fallback;
  const name = source.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 150);
  return name.endsWith(".pdf") ? name : `${name || fallback.replace(/\.pdf$/i, "")}.pdf`;
}

function contentDisposition(fileName: string) {
  const asciiFallback = fileName.normalize("NFKD").replace(/[^\x20-\x7E]+/g, "-").replace(/["\\]/g, "-").replace(/-+/g, "-") || "weekly-curriculum.pdf";
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function POST(request: Request) {
  const context = await requireServiceAccessForCurrentUser("curriculum-distribution");
  if (context instanceof Response) return context;
  if (!context.isAdmin && context.user.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!context.schoolAccountId) return NextResponse.json({ error: "SCHOOL_ACCOUNT_REQUIRED" }, { status: 400 });

  let body: { all?: unknown; subjectId?: unknown; semesterId?: unknown; fileName?: unknown } = {};
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 }); }

  const all = body.all === true;
  const subjectId = typeof body.subjectId === "string" ? body.subjectId.trim() : "";
  const semesterId = typeof body.semesterId === "string" ? body.semesterId.trim() : "";
  const origin = getRequestOrigin(request);
  const printUrl = new URL("/print/curriculum-distribution/week", origin);

  if (all) {
    const saved = await listTeacherSavedCurriculum(context.user.id, context.schoolAccountId);
    if (!saved.length) return NextResponse.json({ error: "NO_SAVED_CURRICULUM" }, { status: 404 });
    printUrl.searchParams.set("all", "1");
  } else {
    if (!subjectId || !semesterId) return NextResponse.json({ error: "CURRICULUM_REFERENCE_REQUIRED" }, { status: 400 });
    const distribution = await getDistribution(subjectId, semesterId);
    if (!distribution) return NextResponse.json({ error: "CURRICULUM_NOT_FOUND" }, { status: 404 });
    printUrl.searchParams.set("subjectId", subjectId);
    printUrl.searchParams.set("semesterId", semesterId);
  }
  printUrl.searchParams.set("print", "1");

  const fileName = safeFileName(body.fileName, all ? "منهج-الأسبوع-موادي.pdf" : "منهج-الأسبوع.pdf");
  try {
    const pdfBytes = await generatePdfFromUrlWithCloudflare({ request, url: printUrl.toString(), waitForSelector: ".weekly-share-root" });
    const pdfBody = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    return new Response(pdfBody, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": contentDisposition(fileName), "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Weekly curriculum PDF export failed.", { message: error instanceof Error ? error.message : "Unknown PDF export error" });
    return NextResponse.json({ error: "WEEKLY_PDF_UNAVAILABLE" }, { status: 503 });
  }
}
