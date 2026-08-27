import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import {
  renderCertificateDocumentHtml,
  type CertificateRenderRecord,
} from "@/lib/certificates/certificate-renderer";

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

async function getCertificate(certificateId: string, schoolAccountId: string) {
  const rows = await certificatePrisma.$queryRawUnsafe<CertificateRenderRecord[]>(
    `
    SELECT id, schoolAccountId, certificateNumber, certificateType, recipientType, recipientName,
           title, reason, body, issueDate, dataJson
    FROM IssuedCertificate
    WHERE id = ? AND schoolAccountId = ?
    LIMIT 1
    `,
    certificateId,
    schoolAccountId,
  );

  return rows[0] || null;
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const { certificateId } = await context.params;
  const certificate = await getCertificate(certificateId, actor.schoolAccountId);

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

  const signatureProfile = await getCertificateSignatureProfile(
    certificate.schoolAccountId,
    actor.role,
    actor.name,
    actor.id,
    false,
  );

  const html = renderCertificateDocumentHtml(certificate, {
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

      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "certificates",
        certificate.id,
      );

      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, "certificate.pdf");
      await fs.writeFile(filePath, Buffer.from(pdfBuffer));

      const pdfUrl = `/uploads/certificates/${certificate.id}/certificate.pdf`;

      await certificatePrisma.$executeRawUnsafe(
        `
        UPDATE IssuedCertificate
        SET pdfUrl = ?, htmlSnapshot = ?, updatedAt = NOW(3)
        WHERE id = ? AND schoolAccountId = ?
        `,
        pdfUrl,
        html,
        certificate.id,
        actor.schoolAccountId,
      );

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
    console.error("CERTIFICATE_PDF_EXPORT_FALLBACK", error);

    await certificatePrisma.$executeRawUnsafe(
      `
      UPDATE IssuedCertificate
      SET htmlSnapshot = ?, updatedAt = NOW(3)
      WHERE id = ? AND schoolAccountId = ?
      `,
      html,
      certificate.id,
      actor.schoolAccountId,
    );

    return NextResponse.json({
      fallback: "PRINT_PREVIEW",
      previewUrl: `/dashboard/certificates/${certificate.id}/preview-print`,
    });
  }
}
