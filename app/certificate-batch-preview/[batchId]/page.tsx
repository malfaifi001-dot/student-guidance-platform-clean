import { notFound, redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import {
  renderCertificatesBatchDocumentHtml,
  type BatchCertificateRenderRecord,
} from "@/lib/certificates/certificate-batch-renderer";
import { CertificatePrintButton } from "@/components/certificates/certificate-print-button";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ batchId: string }>;
  searchParams?: Promise<{ print?: string | string[] }>;
};

async function getBatchCertificates(batchId: string, schoolAccountId: string, createdById: string) {
  return certificatePrisma.$queryRawUnsafe<BatchCertificateRenderRecord[]>(
    `
    SELECT id, schoolAccountId, certificateNumber, certificateType, recipientType, recipientName,
           title, reason, body, issueDate, dataJson
    FROM IssuedCertificate
    WHERE batchId = ? AND schoolAccountId = ? AND createdById = ?
    ORDER BY recipientName ASC, createdAt ASC
    `,
    batchId,
    schoolAccountId,
    createdById,
  );
}

export default async function CertificateBatchPreviewPage({ params, searchParams }: PageProps) {
  const current = await requireDashboardUser();

  if (!current.user.schoolAccountId) redirect("/dashboard");

  const { batchId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const printParam = Array.isArray(resolvedSearchParams.print)
    ? resolvedSearchParams.print[0]
    : resolvedSearchParams.print;
  const certificates = await getBatchCertificates(batchId, current.user.schoolAccountId, current.user.id);

  if (!certificates.length) notFound();

  const signatureProfile = await getCertificateSignatureProfile(
    certificates[0].schoolAccountId,
    current.user.role,
    current.user.officialName || current.user.name || "المستخدم",
    current.user.id,
    true,
  );
  const html = renderCertificatesBatchDocumentHtml(certificates, { signatureProfile });

  return (
    <>
      <CertificatePrintButton autoPrint={printParam === "1"} showButton={false} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
