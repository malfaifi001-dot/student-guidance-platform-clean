import { notFound } from "next/navigation";
import { CertificatePrintButton } from "@/components/certificates/certificate-print-button";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import {
  renderCertificateDocumentHtml,
  type CertificateRenderRecord,
} from "@/lib/certificates/certificate-renderer";

type PageProps = {
  params: Promise<{ certificateId: string }>;
  searchParams?: Promise<{ print?: string | string[] }>;
};

async function getCertificate(certificateId: string, createdById: string) {
  const rows = await prisma.$queryRawUnsafe<CertificateRenderRecord[]>(
    `
    SELECT id, schoolAccountId, certificateNumber, certificateType, recipientType, recipientName,
           title, reason, body, issueDate, dataJson
    FROM IssuedCertificate
    WHERE id = ? AND createdById = ?
    LIMIT 1
    `,
    certificateId,
    createdById,
  );

  return rows[0] || null;
}

export default async function CertificateEmbeddedPreviewPage({ params, searchParams }: PageProps) {
  const current = await requireDashboardUser();

  const { certificateId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const printParam = Array.isArray(resolvedSearchParams.print)
    ? resolvedSearchParams.print[0]
    : resolvedSearchParams.print;
  const certificate = await getCertificate(certificateId, current.user.id);

  if (!certificate) notFound();

  const signatureProfile = await getCertificateSignatureProfile(
    certificate.schoolAccountId,
    current.user.role,
    current.user.officialName || current.user.name || "المستخدم",
    current.user.id,
    true,
  );

  const html = renderCertificateDocumentHtml(certificate, { signatureProfile, last: true });

  return (
    <>
      <CertificatePrintButton autoPrint={printParam === "1"} showButton={false} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
