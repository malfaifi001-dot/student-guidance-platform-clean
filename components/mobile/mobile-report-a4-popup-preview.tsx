"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MobileIcon } from "@/components/mobile/mobile-icons";
import type { MobileReportTemplateOption } from "@/components/mobile/mobile-report-prepare-flow";
import { FinalReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";
import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";
import { applyReportFlowPreparationToPayload } from "@/lib/report-flow/report-flow-payload";
import type { ReportFlowPreparation } from "@/lib/report-flow/report-flow-types";

type MobileReportA4PopupPreviewProps = {
  open: boolean;
  caseId: string;
  payload: SmartReportPayload;
  selectedVariantId: string;
  selectedTemplate: MobileReportTemplateOption | null;
  preparation: ReportFlowPreparation;
  onClose: () => void;
};

const A4_WIDTH_PX = 794;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fieldValueToText(value: SmartReportField["value"]) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean).join("، ");
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  return cleanText(value);
}

function buildFallbackTemplate(
  payload: SmartReportPayload,
  selectedTemplate: MobileReportTemplateOption | null,
) {
  return {
    name: selectedTemplate?.name || payload.title || "التقرير A4",
    designTemplateId: "modern-official",
    pages: [
      {
        id: "mobile-a4-popup-page-1",
        title: "المعاينة",
        kind: "content",
        blocks: [
          {
            id: "mobile-a4-popup-hero",
            kind: "hero-title",
            title: "عنوان التقرير",
            content: "{{case.title}}",
            variant: "hero",
            align: "center",
            showTitle: false,
            placement: "flow",
          },
          {
            id: "mobile-a4-popup-fields",
            kind: "dynamic-fields",
            title: "التفاصيل",
            content: "",
            variant: "card",
            align: "right",
            showTitle: true,
            placement: "flow",
          },
          {
            id: "mobile-a4-popup-summary",
            kind: "multi-paragraph",
            title: payload.narrative.title || "وصف التنفيذ",
            content: cleanText(payload.narrative.body),
            variant: "soft",
            align: "right",
            showTitle: true,
            placement: "flow",
          },
          {
            id: "mobile-a4-popup-evidence",
            kind: "evidence-gallery",
            title: "الشواهد والمرفقات",
            content: "",
            variant: "card",
            align: "right",
            showTitle: true,
            placement: "flow",
            evidenceLayout:
              payload.evidence.items.length > 1 ? "TWO_PER_PAGE" : "ONE_PER_PAGE",
            evidenceFit: "contain",
            evidenceAspectRatio: "LANDSCAPE_4_3",
            evidenceShowCaptions: true,
            evidenceAutoCreatePages: true,
            evidenceEmptyBehavior: "message",
          },
        ],
      },
    ],
  };
}

function hydrateTemplate(
  payload: SmartReportPayload,
  selectedTemplate: MobileReportTemplateOption | null,
) {
  const templateJson = selectedTemplate?.templateJson;
  const smartStudio = isRecord(templateJson?.smartStudio)
    ? (templateJson.smartStudio as Record<string, unknown>)
    : null;

  if (Array.isArray(smartStudio?.pages) && smartStudio.pages.length) {
    return {
      ...smartStudio,
      name:
        cleanText(smartStudio.name) ||
        selectedTemplate?.name ||
        payload.title ||
        "التقرير A4",
      designTemplateId:
        cleanText(smartStudio.designTemplateId) ||
        cleanText(templateJson?.designTemplateId) ||
        "modern-official",
      designConfig:
        smartStudio.designConfig ||
        (isRecord(templateJson) ? templateJson.designConfig : undefined),
    };
  }

  if (
    isRecord(templateJson) &&
    Array.isArray(templateJson.pages) &&
    templateJson.pages.length
  ) {
    return {
      ...templateJson,
      name:
        cleanText(templateJson.name) ||
        selectedTemplate?.name ||
        payload.title ||
        "التقرير A4",
      designTemplateId: cleanText(templateJson.designTemplateId) || "modern-official",
    };
  }

  return buildFallbackTemplate(payload, selectedTemplate);
}

function buildPreviewCaseData({
  caseId,
  preparedPayload,
  preparation,
  selectedVariantId,
}: {
  caseId: string;
  preparedPayload: SmartReportPayload;
  preparation: ReportFlowPreparation;
  selectedVariantId: string;
}) {
  const values = [...preparedPayload.primaryFields, ...preparedPayload.detailFields]
    .map((field) => ({
      fieldKey: cleanText(field.key),
      fieldLabel: cleanText(field.label),
      value: fieldValueToText(field.value),
    }))
    .filter((field) => field.fieldLabel && field.value);

  return {
    caseId,
    title:
      cleanText(preparedPayload.title) ||
      cleanText(preparedPayload.caseInfo.title) ||
      "تقرير",
    status:
      cleanText(preparedPayload.caseInfo.status) ||
      cleanText(preparedPayload.readiness.status) ||
      selectedVariantId,
    createdAt: preparedPayload.caseInfo.createdAt || "",
    updatedAt:
      preparation.updatedAt ||
      preparedPayload.caseInfo.issuedAt ||
      preparedPayload.caseInfo.createdAt ||
      "",
    serviceName: cleanText(preparedPayload.service.name),
    serviceSlug: cleanText(preparedPayload.service.slug),
    student: preparedPayload.student || undefined,
    values,
    evidences: preparedPayload.evidence.items.map((item) => ({
      id: item.id,
      title: cleanText(item.title),
      caption: cleanText(item.caption),
      imageUrl: item.type === "IMAGE" ? item.url || "" : "",
      fileUrl: item.url || "",
    })),
  };
}

export function MobileReportA4PopupPreview({
  open,
  caseId,
  payload,
  selectedVariantId,
  selectedTemplate,
  preparation,
  onClose,
}: MobileReportA4PopupPreviewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const documentRef = useRef<HTMLDivElement | null>(null);
  const [documentScale, setDocumentScale] = useState(1);
  const [documentHeight, setDocumentHeight] = useState(0);

  const preparedPayload = useMemo(
    () => applyReportFlowPreparationToPayload(payload, preparation),
    [payload, preparation],
  );

  const template = useMemo(
    () => hydrateTemplate(preparedPayload, selectedTemplate),
    [preparedPayload, selectedTemplate],
  );

  const previewCaseData = useMemo(
    () =>
      buildPreviewCaseData({
        caseId,
        preparedPayload,
        preparation,
        selectedVariantId,
      }),
    [caseId, preparedPayload, preparation, selectedVariantId],
  );

  const reportTitle =
    previewCaseData.title || preparedPayload.title || payload.caseInfo.title || "التقرير";

  const updateScale = useCallback(() => {
    const shell = shellRef.current;
    const doc = documentRef.current;

    if (!shell || !doc) return;

    const availableWidth = Math.max(280, shell.clientWidth - 10);
    const nextScale = Math.min(1, availableWidth / A4_WIDTH_PX);

    setDocumentScale(Number(nextScale.toFixed(4)));
    setDocumentHeight(Math.ceil(doc.scrollHeight * nextScale));
  }, []);

  useEffect(() => {
    if (!open) return;

    updateScale();

    const shell = shellRef.current;
    const doc = documentRef.current;
    const resizeObserver = new ResizeObserver(updateScale);

    if (shell) resizeObserver.observe(shell);
    if (doc) resizeObserver.observe(doc);

    window.addEventListener("resize", updateScale);

    const timer = window.setTimeout(updateScale, 500);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScale);
      window.clearTimeout(timer);
    };
  }, [open, template, previewCaseData, updateScale]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}
    >
      <style>{`
        .mobile-a4-popup-frame {
          width: 210mm;
          min-width: 210mm;
          max-width: 210mm;
        }

        .mobile-a4-popup-frame > section {
          width: 210mm !important;
          max-width: 210mm !important;
          margin: 0 !important;
        }

        .mobile-a4-popup-frame .pdf-report-page,
        .mobile-a4-popup-frame [data-report-design-page],
        .mobile-a4-popup-frame .report-design-page {
          width: 210mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          margin: 0 auto 16px auto !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14) !important;
        }

        .mobile-a4-popup-frame .pdf-report-page:last-child,
        .mobile-a4-popup-frame [data-report-design-page]:last-child,
        .mobile-a4-popup-frame .report-design-page:last-child {
          margin-bottom: 0 !important;
        }

        /*
          Force A4 print layout inside the popup.
          Tailwind sm:/md: classes depend on the real phone viewport,
          so we override them here to keep A4 fields side-by-side.
        */
        .mobile-a4-popup-frame .sm\:grid-cols-2,
        .mobile-a4-popup-frame .md\:grid-cols-2,
        .mobile-a4-popup-frame .lg\:grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .mobile-a4-popup-frame .sm\:grid-cols-3,
        .mobile-a4-popup-frame .md\:grid-cols-3,
        .mobile-a4-popup-frame .lg\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        .mobile-a4-popup-frame .sm\:grid-cols-4,
        .mobile-a4-popup-frame .md\:grid-cols-4,
        .mobile-a4-popup-frame .lg\:grid-cols-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }

        .mobile-a4-popup-frame .sm\:grid-cols-5,
        .mobile-a4-popup-frame .md\:grid-cols-5,
        .mobile-a4-popup-frame .lg\:grid-cols-5 {
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        }
        /*
          Force A4 print layout inside the popup.
          Tailwind responsive classes depend on the real phone viewport,
          so these selectors keep A4 grids side-by-side.
        */
        .mobile-a4-popup-frame [class~="sm:grid-cols-2"],
        .mobile-a4-popup-frame [class~="md:grid-cols-2"],
        .mobile-a4-popup-frame [class~="lg:grid-cols-2"] {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .mobile-a4-popup-frame [class~="sm:grid-cols-3"],
        .mobile-a4-popup-frame [class~="md:grid-cols-3"],
        .mobile-a4-popup-frame [class~="lg:grid-cols-3"] {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        .mobile-a4-popup-frame [class~="sm:grid-cols-4"],
        .mobile-a4-popup-frame [class~="md:grid-cols-4"],
        .mobile-a4-popup-frame [class~="lg:grid-cols-4"] {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
      `}</style>

      <div className="flex max-h-[86vh] w-full max-w-[390px] flex-col overflow-hidden rounded-[2.1rem] bg-white shadow-2xl shadow-sky-950/20 ring-1 ring-white/80" onClick={(event) => event.stopPropagation()}>
<main className="max-h-[86vh] overflow-y-auto bg-gradient-to-b from-sky-50 via-white to-sky-50 p-3">
          <section
            ref={shellRef}
            className="mx-auto w-full overflow-hidden rounded-[1.55rem] bg-white p-2 shadow-lg shadow-sky-100 ring-1 ring-sky-100"
          >
            <div
              className="relative mx-auto"
              style={{
                height: documentHeight ? `${documentHeight}px` : undefined,
              }}
            >
              <div
                ref={documentRef}
                className="mobile-a4-popup-frame absolute left-1/2 top-0"
                style={{
                  transform: `translateX(-50%) scale(${documentScale})`,
                  transformOrigin: "top center",
                }}
              >
                <FinalReportDesignRenderer
                  template={template}
                  previewCaseData={previewCaseData}
                  identity={{
                    ...(preparedPayload as any).identity,
                    semester:
                      cleanText((preparedPayload as any).identity?.currentSemester) ||
                      cleanText((preparedPayload as any).identity?.academicYear),
                  }}
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>,
    document.body,
  );
}