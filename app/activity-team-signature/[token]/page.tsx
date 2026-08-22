import type { Metadata } from "next";

import { PublicReportSignatureForm } from "@/components/report-signatures/public-report-signature-form";
import { ReportTwoPrintDocument } from "@/components/report-2/report-two-print-document";
import { getPublicActivityTeamSignature } from "@/lib/activity-team/activity-team-signature-service";

export const metadata: Metadata = {
  title: "توقيع فريق النشاط الطلابي",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ActivityTeamSignaturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicActivityTeamSignature(token);
  if (!data) {
    return <main className="grid min-h-screen place-items-center bg-slate-100 p-4" dir="rtl"><section className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black text-red-700">رابط التوقيع غير صالح</h1><p className="mt-3 text-sm font-bold leading-7 text-slate-600">تحقق من الرابط أو اطلب رابطًا جديدًا من رائد النشاط.</p></section></main>;
  }

  return (
    <PublicReportSignatureForm
      token={token}
      reportPreview={<ReportTwoPrintDocument snapshot={data.report} />}
      requesterDisplayName={data.requesterDisplayName}
      principalName={data.principalName}
      status={data.status}
      mode="activity-team"
      supervisorOptions={data.supervisors}
    />
  );
}
