import { CertificatePrintButton } from "@/components/certificates/certificate-print-button";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import { notFound, redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import {
  renderCertificateDocumentHtml,
  type CertificateRenderRecord,
} from "@/lib/certificates/certificate-renderer";

type PageProps = {
  params: Promise<{
    certificateId: string;
  }>;
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

export default async function CertificatePrintPreviewPage({ params }: PageProps) {
  const current = await requireDashboardUser();

  if (!current.user.schoolAccountId) {
    redirect("/dashboard");
  }

  const { certificateId } = await params;
  const certificate = await getCertificate(certificateId, current.user.schoolAccountId);

  if (!certificate) {
    notFound();
  }

  const signatureProfile = await getCertificateSignatureProfile(
    certificate.schoolAccountId,
    current.user.role,
    current.user.officialName || current.user.name || "المستخدم",
    current.user.id,
    false,
  );

  const html = renderCertificateDocumentHtml(certificate, {
    signatureProfile,
  });

  return (
    <main className="min-h-screen bg-slate-200" dir="rtl">
      <div className="no-print sticky top-0 z-50 border-b border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-950">معاينة الطباعة</p>
            <p className="text-xs text-slate-500">استخدم زر الطباعة أو حفظ كـ PDF من المتصفح.</p>
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
