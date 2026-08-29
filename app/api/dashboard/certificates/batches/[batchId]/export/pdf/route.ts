import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import {
  renderCertificatesBatchDocumentHtml,
  type BatchCertificateRenderRecord,
} from "@/lib/certificates/certificate-batch-renderer";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

async function getBatchCertificates(batchId: string, schoolAccountId: string) {
  const rows = await certificatePrisma.$queryRawUnsafe<BatchCertificateRenderRecord[]>(
    `
    SELECT id, schoolAccountId, certificateNumber, certificateType, recipientType, recipientName,
           title, reason, body, issueDate, dataJson
    FROM IssuedCertificate
    WHERE batchId = ? AND schoolAccountId = ?
    ORDER BY recipientName ASC, createdAt ASC
    `,
    batchId,
    schoolAccountId,
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
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const { batchId } = await context.params;
  const certificates = await getBatchCertificates(batchId, actor.schoolAccountId);

  if (!certificates.length) {
    return NextResponse.json(
      { error: "لم يتم العثور على شهادات هذه الدفعة." },
      { status: 404 },
    );
  }

  const batchSchoolAccountId = certificates[0].schoolAccountId;
  const isAuthenticatedSchoolBatch = certificates.every(
    (certificate) =>
      certificate.schoolAccountId === actor.schoolAccountId &&
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

  const signatureProfile = await getCertificateSignatureProfile(
    batchSchoolAccountId,
    actor.role,
    actor.name,
    actor.id,
    true,
  );

  const html = renderCertificatesBatchDocumentHtml(certificates, {
    baseUrl: new URL(request.url).origin,
    signatureProfile,
  });

  try {
    const puppeteer = await import("puppeteer");

    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: "domcontentloaded",
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });

      const pdfBody = pdfBuffer.buffer.slice(
        pdfBuffer.byteOffset,
        pdfBuffer.byteOffset + pdfBuffer.byteLength,
      ) as ArrayBuffer;

      return new NextResponse(pdfBody, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("CERTIFICATES_BATCH_PDF_EXPORT_FALLBACK", error);

    return NextResponse.json({
      fallback: "PRINT_PREVIEW",
      previewUrl: `/certificate-batch-preview/${batchId}`,
    });
  }
}
