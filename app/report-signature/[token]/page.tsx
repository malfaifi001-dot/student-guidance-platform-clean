import type { Metadata } from "next";

import { PublicReportSignatureForm } from "@/components/report-signatures/public-report-signature-form";
import { ReportTwoActivePreviewRenderer } from "@/components/report-2/report-two-active-preview-renderer";
import { getPublicReportSignatureRequest } from "@/lib/report-signatures/report-signature-service";
import { isReportTwoSignatureSnapshot } from "@/lib/report-signatures/report-two-signature";

export const metadata: Metadata = {
  title: "توقيع التقرير",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function ReportSignaturePage({ params }: Props) {
  const { token } = await params;
  const request = await getPublicReportSignatureRequest(token);

  if (!request || !isReportTwoSignatureSnapshot(request.reportSnapshot)) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-4" dir="rtl">
        <section className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-red-700">رابط التوقيع غير صالح</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">تحقق من الرابط أو اطلب رابطًا جديدًا من مرسل التقرير.</p>
        </section>
      </main>
    );
  }

  if (request.status !== "PENDING") {
    const signed = request.status === "SIGNED";
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-4" dir="rtl">
        <section className={`w-full max-w-xl rounded-[2rem] border bg-white p-8 text-center shadow-sm ${signed ? "border-emerald-200" : "border-red-200"}`}>
          <h1 className={`text-2xl font-black ${signed ? "text-emerald-700" : "text-red-700"}`}>
            {signed
              ? "تم توقيع التقرير مسبقًا"
              : request.status === "EXPIRED"
                ? "انتهت صلاحية الرابط"
                : "تم إلغاء طلب التوقيع"}
          </h1>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
            {signed
              ? "لا يمكن استخدام رابط التوقيع مرة أخرى."
              : "اطلب رابطًا جديدًا من مرسل التقرير عند الحاجة."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <PublicReportSignatureForm
      token={token}
      reportPreview={
        <ReportTwoActivePreviewRenderer
          template={request.reportSnapshot.report.template}
          context={request.reportSnapshot.report.context}
          previewCase={request.reportSnapshot.report.previewCase}
          sourcePayload={request.reportSnapshot.report.sourcePayload}
          variantId={request.reportSnapshot.report.variantId}
        />
      }
      requesterDisplayName={request.requesterDisplayName}
      principalName={request.principalName || "مدير المدرسة"}
      status="PENDING"
    />
  );
}
