import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import type { BatchCertificateRenderRecord } from "@/lib/certificates/certificate-batch-renderer";
import { getRequestOrigin } from "@/lib/http/request-origin";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

async function getBatchCertificates(batchId: string, createdById: string) {
  const rows = await certificatePrisma.$queryRawUnsafe<BatchCertificateRenderRecord[]>(
    `
    SELECT id, schoolAccountId, certificateNumber, certificateType, recipientType, recipientName,
           title, reason, body, issueDate, dataJson
    FROM IssuedCertificate
    WHERE batchId = ? AND createdById = ?
    ORDER BY recipientName ASC, createdAt ASC
    `,
    batchId,
    createdById,
  );

  return rows;
}

function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getCertificateActor({ allowUnlinkedRead: true });

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const { batchId } = await context.params;
  const batch = await certificatePrisma.certificateBatch.findFirst({
    where: { id: batchId, createdById: actor.id },
    select: { id: true },
  });
  if (!batch) {
    return NextResponse.json(
      { error: "Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø´Ù‡Ø§Ø¯Ø§Øª Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙØ¹Ø©." },
      { status: 404 },
    );
  }

  const certificates = await getBatchCertificates(batchId, actor.id);

  if (!certificates.length) {
    return NextResponse.json(
      { error: "لم يتم العثور على شهادات هذه الدفعة." },
      { status: 404 },
    );
  }

  const batchSchoolAccountId = certificates[0].schoolAccountId;
  const isAuthenticatedSchoolBatch = certificates.every(
    (certificate) =>
      certificate.schoolAccountId === batchSchoolAccountId,
  );

  if (!isAuthenticatedSchoolBatch) {
    return NextResponse.json(
      { error: "لم يتم العثور على شهادات هذه الدفعة." },
      { status: 404 },
    );
  }

  let requestedFileName = "";

  try {
    const body = await request.json();
    requestedFileName = String(body?.fileName || "").trim();
  } catch {
    requestedFileName = "";
  }

  const fileName =
    safeFileName(requestedFileName) ||
    safeFileName(`دفعة شهادات - ${new Date().toISOString().slice(0, 10)}.pdf`);

  const printUrl = new URL(`/certificate-batch-preview/${encodeURIComponent(batchId)}`, getRequestOrigin(request));
  printUrl.searchParams.set("print", "1");

  try {
    const pdfBytes = await generatePdfFromUrlWithCloudflare({ request, url: printUrl.toString(), waitForSelector: ".certificate-shell", landscape: true });
    const pdfBody = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    return new NextResponse(pdfBody, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Certificates batch Cloudflare PDF export failed.", { message: error instanceof Error ? error.message : "Unknown PDF export error" });
    return NextResponse.json({ fallback: "PRINT_PREVIEW", previewUrl: printUrl.pathname + printUrl.search, fileName }, { status: 503 });
  }
}
