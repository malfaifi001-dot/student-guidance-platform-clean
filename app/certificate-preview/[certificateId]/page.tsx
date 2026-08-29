import { notFound, redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import {
  renderCertificateDocumentHtml,
  type CertificateRenderRecord,
} from "@/lib/certificates/certificate-renderer";

type PageProps = {
  params: Promise<{ certificateId: string }>;
};

async function getCertificate(certificateId: string, schoolAccountId: string) {
  const rows = await prisma.$queryRawUnsafe<CertificateRenderRecord[]>(
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

export default async function CertificateEmbeddedPreviewPage({ params }: PageProps) {
  const current = await requireDashboardUser();

  if (!current.user.schoolAccountId) {
    redirect("/dashboard");
  }

  const { certificateId } = await params;
  const certificate = await getCertificate(certificateId, current.user.schoolAccountId);

  if (!certificate) notFound();

  const signatureProfile = await getCertificateSignatureProfile(
    certificate.schoolAccountId,
    current.user.role,
    current.user.officialName || current.user.name || "المستخدم",
    current.user.id,
    true,
  );

  const html = renderCertificateDocumentHtml(certificate, { signatureProfile });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
