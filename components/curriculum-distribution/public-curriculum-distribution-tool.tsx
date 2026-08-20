"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { CurriculumDistributionShell } from "@/components/curriculum-distribution/curriculum-distribution-shell";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { trackAnalyticsEvent } from "@/lib/analytics/analytics-client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/analytics-events";

export function PublicCurriculumDistributionTool({ campaignRef = "" }: { campaignRef?: string }) {
  const [ctaOpen, setCtaOpen] = useState(false);

  const track = (event: "VIEW" | "PREVIEW" | "DOWNLOAD") => {
    const params = campaignRef ? { campaign_ref: campaignRef } : undefined;
    if (event === "VIEW") trackAnalyticsEvent(ANALYTICS_EVENTS.CURRICULUM_DISTRIBUTION_VIEW, params);
    if (event === "PREVIEW") trackAnalyticsEvent(ANALYTICS_EVENTS.CURRICULUM_DISTRIBUTION_PREVIEW, params);
    if (event === "DOWNLOAD") trackAnalyticsEvent(ANALYTICS_EVENTS.CURRICULUM_DISTRIBUTION_DOWNLOAD, params);
  };

  useEffect(() => {
    track("VIEW");
    // This component intentionally does not persist personal identifiers.
    // GA receives only the optional short campaign reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <CurriculumDistributionShell
        apiPath="/api/public/curriculum-distribution"
        printPath="/free/curriculum-distribution/studio"
        exportPath="/api/public/curriculum-distribution/export/pdf"
        downloadFileName="Teachix | الأسهل والأشمل.pdf"
        previewPath="/print/curriculum-distribution"
        publicPreview
        campaignRef={campaignRef}
        onPublicEvent={track}
        onDownloadComplete={() => setCtaOpen(true)}
      />
      <SmartActionModal
        open={ctaOpen}
        title="استفد من بقية خدمات Teachix"
        description="تقارير، تحليل نتائج، ملفات إنجاز، استبيانات، شهادات، وخدمات مدرسية أخرى في مكان واحد. ابدأ بتجربة أكثر تنظيمًا لعملك المدرسي."
        variant="success"
        showFooter={false}
        onClose={() => setCtaOpen(false)}
      >
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-sky-800">
            <CheckCircle2 className="h-5 w-5" />
            اشتراك المعلم السنوي بـ 19 ريال فقط
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/register${campaignRef ? `?ref=${encodeURIComponent(campaignRef)}` : ""}`}
              onClick={() => trackAnalyticsEvent(ANALYTICS_EVENTS.CURRICULUM_DISTRIBUTION_CTA_CLICK, campaignRef ? { campaign_ref: campaignRef } : undefined)}
              className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-sky-600 px-4 py-3 text-center text-sm font-black leading-none text-white transition hover:bg-sky-700 sm:w-auto sm:flex-1"
            >
              اشترك الآن <ArrowLeft className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setCtaOpen(false)}
              className="min-h-12 w-full shrink-0 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black leading-none text-slate-600 sm:w-auto"
            >
              لاحقًا
            </button>
          </div>
        </div>
      </SmartActionModal>
    </>
  );
}
