"use client";

import { useEffect, useMemo, useState } from "react";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { MobileReportA4PopupPreview } from "@/components/mobile/mobile-report-a4-popup-preview";
import { MobileIcon } from "@/components/mobile/mobile-icons";
import { MobilePopCard } from "@/components/mobile/mobile-pop-card";
import type { MobileReportTemplateOption } from "@/components/mobile/mobile-report-prepare-flow";
import { MobileReportReadablePreview } from "@/components/mobile/mobile-report-readable-preview";
import { getReportVariantById } from "@/lib/report-engine/report-variant-registry";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import { loadReportFlowPreparation } from "@/lib/report-flow/report-flow-storage";
import type { ReportFlowPreparation } from "@/lib/report-flow/report-flow-types";

type MobileReportReadyPageProps = {
  caseId: string;
  payload: SmartReportPayload;
  selectedVariantId: string;
  templates: MobileReportTemplateOption[];
  selectedTemplateId?: string;
  approvedSnapshot?: {
    id: string;
    previewUrl: string;
  } | null;
};

type FeedbackState = {
  open: boolean;
  title: string;
  description?: string;
  variant: "info" | "success" | "warning" | "error";
};

export function MobileReportReadyPage({
  caseId,
  payload,
  selectedVariantId,
  templates,
  selectedTemplateId = "",
}: MobileReportReadyPageProps) {
  const selectedVariant = getReportVariantById(selectedVariantId);
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ||
    templates[0] ||
    null;

  const [preparation, setPreparation] =
    useState<ReportFlowPreparation | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    title: "",
    description: "",
    variant: "info",
  });

  useEffect(() => {
    const loaded = loadReportFlowPreparation(caseId, selectedVariant.id);

    if (!loaded) {
      setFeedback({
        open: true,
        title: "التحضير غير مكتمل",
        description:
          "لم يتم العثور على إعدادات محفوظة لهذا التقرير. ارجع إلى صفحة التحضير ثم حاول مرة أخرى.",
        variant: "warning",
      });
      return;
    }

    setPreparation(loaded);
  }, [caseId, selectedVariant.id]);

  const reportTitle = useMemo(
    () => payload.title || payload.caseInfo.title || "التقرير",
    [payload.caseInfo.title, payload.title],
  );

  function openPreview() {
    if (!preparation) {
      setFeedback({
        open: true,
        title: "المعاينة غير جاهزة",
        description:
          "لم يتم العثور على تحضير محفوظ لهذا التقرير. ارجع إلى صفحة التحضير أولًا.",
        variant: "warning",
      });
      return;
    }

    setPreviewOpen(true);
  }

  function approveAndDownload() {
    setFeedback({
      open: true,
      title: "اعتماد وتحميل",
      description:
        "الخطوة التالية ستكون ربط الاعتماد النهائي بتحميل PDF مباشرة من نفس الشاشة.",
      variant: "info",
    });
  }

  return (
    <MobileAppShell activeSection="reports">
      <div className="space-y-4 pb-28" dir="rtl">
        {preparation ? (
          <MobileReportReadablePreview
            caseId={caseId}
            payload={payload}
            selectedVariantId={selectedVariant.id}
            selectedTemplate={selectedTemplate}
            preparation={preparation}
          />
        ) : (
          <section className="rounded-[1.6rem] bg-white/95 p-4 shadow-sm ring-1 ring-amber-100">
            <div className="rounded-[1.35rem] bg-amber-50/90 p-4 ring-1 ring-amber-100">
              <p className="text-sm font-black text-amber-900">
                لا توجد نسخة جاهزة للعرض الآن
              </p>
              <p className="mt-2 text-sm font-bold leading-7 text-amber-800">
                افتح صفحة التحضير أولًا، ثم احفظ الحقول ووصف التنفيذ.
              </p>
            </div>
          </section>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={openPreview}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-[1.45rem] bg-white text-base font-black text-sky-700 shadow-sm ring-1 ring-sky-100 transition hover:bg-sky-50"
          >
            <MobileIcon name="file" className="h-5 w-5" />
            معاينة التقرير
          </button>

          <button
            type="button"
            onClick={approveAndDownload}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-[1.45rem] bg-sky-600 text-base font-black text-white shadow-xl shadow-sky-200 transition hover:bg-sky-700"
          >
            <MobileIcon name="shield" className="h-5 w-5" />
            اعتماد وتحميل
          </button>
        </div>
      </div>

      {previewOpen && preparation ? (
        <MobileReportA4PopupPreview
          open={previewOpen}
          caseId={caseId}
          payload={payload}
          selectedVariantId={selectedVariant.id}
          selectedTemplate={selectedTemplate}
          preparation={preparation}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      <MobilePopCard
        open={feedback.open}
        title={feedback.title}
        description={feedback.description}
        variant={feedback.variant}
        onClose={() =>
          setFeedback((current) => ({
            ...current,
            open: false,
          }))
        }
      />
    </MobileAppShell>
  );
}