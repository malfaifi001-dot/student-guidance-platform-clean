import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import type { CertificateRenderRecord } from "@/lib/certificates/certificate-renderer";
import { getRequestOrigin } from "@/lib/http/request-origin";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    certificateId: string;
  }>;
};

function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function getCertificate(certificateId: string, schoolAccountId: string, createdById: string) {
  const rows = await certificatePrisma.$queryRawUnsafe<CertificateRenderRecord[]>(
    `
    SELECT id, schoolAccountId, certificateNumber, certificateType, recipientType, recipientName,
           title, reason, body, issueDate, dataJson
    FROM IssuedCertificate
    WHERE id = ? AND schoolAccountId = ? AND createdById = ?
    LIMIT 1
    `,
    certificateId,
    schoolAccountId,
    createdById,
  );

  return rows[0] || null;
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const { certificateId } = await context.params;
  const certificate = await getCertificate(certificateId, actor.schoolAccountId, actor.id);

  if (!certificate) {
    return NextResponse.json({ error: "الشهادة غير موجودة." }, { status: 404 });
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
    safeFileName(`${certificate.recipientName} - ${certificate.certificateNumber}.pdf`);

  const printUrl = new URL(`/certificate-preview/${encodeURIComponent(certificate.id)}`, getRequestOrigin(request));
  printUrl.searchParams.set("print", "1");

  try {
    const pdfBytes = await generatePdfFromUrlWithCloudflare({ request, url: printUrl.toString(), waitForSelector: ".certificate-shell", landscape: true });
    const pdfBody = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    return new NextResponse(pdfBody, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Certificate Cloudflare PDF export failed.", { message: error instanceof Error ? error.message : "Unknown PDF export error" });
    return NextResponse.json({ fallback: "PRINT_PREVIEW", previewUrl: printUrl.pathname + printUrl.search, fileName }, { status: 503 });
  }
}
