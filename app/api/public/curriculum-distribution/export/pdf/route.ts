import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/http/request-origin";
import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

export const runtime = "nodejs";

function safeFileName(value: unknown) {
  const name = String(value || "curriculum-distribution.pdf")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);

  return name.endsWith(".pdf") ? name : `${name || "curriculum-distribution"}.pdf`;
}

function contentDisposition(fileName: string) {
  const asciiFallback = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, "-")
    .replace(/["\\]/g, "-")
    .replace(/-+/g, "-") || "curriculum-distribution.pdf";
  const encodedFileName = encodeURIComponent(fileName).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export async function POST(request: Request) {
  let body: { subjectId?: unknown; semesterId?: unknown; fileName?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: "بيانات التصدير غير صالحة." },
      { status: 400 },
    );
  }

  const subjectId = clean(body.subjectId);
  const semesterId = clean(body.semesterId);
  if (!subjectId || !semesterId) {
    return NextResponse.json(
      { success: false, error: "يجب تحديد المادة والفصل الدراسي." },
      { status: 400 },
    );
  }

  const distribution = await getDistribution(subjectId, semesterId);
  if (!distribution) {
    return NextResponse.json(
      { success: false, error: "توزيع المنهج غير موجود." },
      { status: 404 },
    );
  }

  const origin = getRequestOrigin(request);
  const printUrl = new URL("/print/curriculum-distribution", origin);
  printUrl.searchParams.set("subjectId", subjectId);
  printUrl.searchParams.set("semesterId", semesterId);
  printUrl.searchParams.set("public", "1");
  printUrl.searchParams.set("print", "1");

  try {
    const pdfBytes = await generatePdfFromUrlWithCloudflare({
      request,
      url: printUrl.toString(),
      waitForSelector: ".curriculum-print-paper",
      landscape: true,
    });
    const pdfBody = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;

    return new Response(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(safeFileName(body.fileName)),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Public curriculum distribution Cloudflare PDF export failed.", {
      message: error instanceof Error ? error.message : "Unknown PDF export error",
    });

    return NextResponse.json(
      {
        fallback: "PRINT_PREVIEW",
        previewUrl: printUrl.pathname + printUrl.search,
        fileName: safeFileName(body.fileName),
      },
      { status: 503 },
    );
  }
}
