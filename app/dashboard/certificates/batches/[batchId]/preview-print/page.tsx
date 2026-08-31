import { CertificatePrintButton } from "@/components/certificates/certificate-print-button";
import { notFound, redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import {
  renderCertificatesBatchDocumentHtml,
  type BatchCertificateRenderRecord,
} from "@/lib/certificates/certificate-batch-renderer";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";

type PageProps = {
  params: Promise<{
    batchId: string;
  }>;
  searchParams?: Promise<{
    print?: string | string[];
  }>;
};

async function getBatchCertificates(batchId: string, createdById: string) {
  const rows = await prisma.$queryRawUnsafe<BatchCertificateRenderRecord[]>(
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

export default async function CertificatesBatchPrintPreviewPage({ params, searchParams }: PageProps) {
  const current = await requireDashboardUser();

  const { batchId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const printParam = Array.isArray(resolvedSearchParams.print)
    ? resolvedSearchParams.print[0]
    : resolvedSearchParams.print;

  redirect(
    `/certificate-batch-preview/${encodeURIComponent(batchId)}${
      printParam === "1" ? "?print=1" : ""
    }`,
  );

  const certificates = await getBatchCertificates(batchId, current.user.id);

  if (!certificates.length) {
    notFound();
  }

  const batchSchoolAccountId = certificates[0].schoolAccountId;
  const batch = await prisma.certificateBatch.findFirst({
    where: { id: batchId, createdById: current.user.id },
    select: { id: true },
  });

  if (!batch || certificates.some((certificate) => certificate.schoolAccountId !== batchSchoolAccountId)) {
    notFound();
  }

  const signatureProfile = await getCertificateSignatureProfile(
    batchSchoolAccountId,
    current.user.role,
    current.user.officialName || current.user.name || "المستخدم",
    current.user.id,
    true,
  );

  const html = renderCertificatesBatchDocumentHtml(certificates, {
    signatureProfile,
  });

  return (
    <main className="min-h-screen bg-slate-200" dir="rtl">
      <div className="no-print sticky top-0 z-50 border-b border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-950">معاينة طباعة الدفعة</p>
            <p className="text-xs text-slate-500">
              كل شهادة في صفحة مستقلة. استخدم الطباعة أو حفظ PDF من المتصفح.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/dashboard/certificates"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600"
            >
              العودة للأرشيف
            </a>

            <CertificatePrintButton />
          </div>
        </div>
      </div>

      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
