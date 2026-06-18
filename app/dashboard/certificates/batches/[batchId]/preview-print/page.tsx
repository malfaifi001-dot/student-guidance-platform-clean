import { notFound, redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import {
  renderCertificatesBatchDocumentHtml,
  type BatchCertificateRenderRecord,
} from "@/lib/certificates/certificate-batch-renderer";

type PageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

async function getBatchCertificates(batchId: string, schoolAccountId: string) {
  const rows = await prisma.$queryRawUnsafe<BatchCertificateRenderRecord[]>(
    `
    SELECT id, certificateNumber, certificateType, recipientType, recipientName,
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

export default async function CertificatesBatchPrintPreviewPage({ params }: PageProps) {
  const current = await requireDashboardUser();

  if (!current.user.schoolAccountId) {
    redirect("/dashboard");
  }

  const { batchId } = await params;
  const certificates = await getBatchCertificates(batchId, current.user.schoolAccountId);

  if (!certificates.length) {
    notFound();
  }

  const html = renderCertificatesBatchDocumentHtml(certificates);

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

            <button
              id="print-batch-certificates"
              type="button"
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white"
            >
              طباعة / حفظ PDF
            </button>
          </div>
        </div>
      </div>

      <div dangerouslySetInnerHTML={{ __html: html }} />

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById("print-batch-certificates")?.addEventListener("click", function () {
              window.print();
            });
          `,
        }}
      />
    </main>
  );
}