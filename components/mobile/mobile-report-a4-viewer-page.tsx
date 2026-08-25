"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { MobileIcon } from "@/components/mobile/mobile-icons";
import { MobilePopCard } from "@/components/mobile/mobile-pop-card";
import type { MobileReportTemplateOption } from "@/components/mobile/mobile-report-prepare-flow";
import { FinalReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";
import { getReportVariantById } from "@/lib/report-engine/report-variant-registry";
import type { SmartReportField, SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import { applyReportFlowPreparationToPayload } from "@/lib/report-flow/report-flow-payload";
import { loadReportFlowPreparation } from "@/lib/report-flow/report-flow-storage";
import type { ReportFlowPreparation } from "@/lib/report-flow/report-flow-types";
import { downloadBlobAsFile } from "@/lib/print-export/print-export-download";
import { savePrintPreviewAsNativePdf } from "@/lib/native/native-download";
import { isNativeCapacitor } from "@/lib/native/native-runtime";

type MobileReportA4ViewerPageProps = {
  caseId: string;
  payload: SmartReportPayload;
  selectedVariantId: string;
  templates: MobileReportTemplateOption[];
  selectedTemplateId?: string;
};

type FeedbackState = {
  open: boolean;
  title: string;
  description?: string;
  variant: "info" | "success" | "warning" | "error";
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

function formatDate(value?: string | null) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return cleanText(value);
  }
}

function safeFileName(value: unknown) {
  const text = cleanText(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);

  return text || "تقرير";
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
        id: "mobile-a4-page-1",
        title: "المعاينة",
        kind: "content",
        blocks: [
          {
            id: "mobile-a4-hero",
            kind: "hero-title",
            title: "عنوان التقرير",
            content: "{{case.title}}",
            variant: "hero",
            align: "center",
            showTitle: false,
            placement: "flow",
          },
          {
            id: "mobile-a4-fields",
            kind: "dynamic-fields",
            title: "التفاصيل",
            content: "",
            variant: "card",
            align: "right",
            showTitle: true,
            placement: "flow",
          },
          {
            id: "mobile-a4-summary",
            kind: "multi-paragraph",
            title: payload.narrative.title || "وصف التنفيذ",
            content: cleanText(payload.narrative.body),
            variant: "soft",
            align: "right",
            showTitle: true,
            placement: "flow",
          },
          {
            id: "mobile-a4-evidence",
            kind: "evidence-gallery",
            title: "الشواهد والمرفقات",
            content: "",
            variant: "card",
            align: "right",
            showTitle: true,
            placement: "flow",
            evidenceLayout: payload.evidence.items.length > 1 ? "TWO_PER_PAGE" : "ONE_PER_PAGE",
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
      designTemplateId:
        cleanText(templateJson.designTemplateId) || "modern-official",
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

function buildExportContext(
  preparedPayload: SmartReportPayload,
  previewCaseData: ReturnType<typeof buildPreviewCaseData>,
) {
  const student = previewCaseData.student || {};
  const identity = (preparedPayload as any).identity || {};
  const context: Record<string, string> = {
    "case.id": previewCaseData.caseId,
    "case.title": previewCaseData.title,
    "case.status": previewCaseData.status,
    "case.createdAt": formatDate(previewCaseData.createdAt),
    "case.updatedAt": formatDate(previewCaseData.updatedAt),

    caseId: previewCaseData.caseId,
    caseTitle: previewCaseData.title,
    reportTitle: previewCaseData.title,

    "service.name": previewCaseData.serviceName,
    "service.slug": previewCaseData.serviceSlug,
    serviceName: previewCaseData.serviceName,
    serviceSlug: previewCaseData.serviceSlug,

    "student.name": cleanText((student as any).name),
    "student.grade": cleanText((student as any).grade),
    "student.classroom": cleanText((student as any).classroom),
    "student.stage": cleanText((student as any).stage),
    "student.guardianName": cleanText((student as any).guardianName),
    "student.guardianPhone": cleanText((student as any).guardianPhone),

    studentName: cleanText((student as any).name),
    studentGrade: cleanText((student as any).grade),
    studentClassroom: cleanText((student as any).classroom),
    studentStage: cleanText((student as any).stage),

    "identity.schoolName": cleanText(identity.schoolName || identity.school?.name),
    "identity.ministryName": cleanText(identity.ministryName) || "وزارة التعليم",
    "identity.educationDepartment": cleanText(identity.educationDepartment),
    "identity.educationOffice": cleanText(identity.educationOffice),
    "identity.academicYear": cleanText(identity.academicYear),
    "identity.semester":
      cleanText(identity.currentSemester) || cleanText(identity.semester),
    "identity.counselorName":
      cleanText(identity.counselorName) || cleanText(identity.counselor?.name),
    "identity.principalName":
      cleanText(identity.principalName) ||
      cleanText(identity.schoolLeaderName) ||
      cleanText(identity.school?.principalName),

    schoolName: cleanText(identity.schoolName || identity.school?.name),
    ministryName: cleanText(identity.ministryName) || "وزارة التعليم",
    counselorName:
      cleanText(identity.counselorName) || cleanText(identity.counselor?.name),
    principalName:
      cleanText(identity.principalName) ||
      cleanText(identity.schoolLeaderName) ||
      cleanText(identity.school?.principalName),

    "report.logoUrl":
      cleanText(identity.logoUrl) ||
      cleanText(identity.schoolLogoUrl) ||
      "/uploads/school-logos/MOE.png",
    "report.platformName": "منصة التوجيه الطلابي",
    "evidence.count": String(previewCaseData.evidences.length),
    evidenceCount: String(previewCaseData.evidences.length),
  };

  previewCaseData.values.forEach((item) => {
    if (item.fieldKey) {
      context[item.fieldKey] = item.value;
      context[`field.${item.fieldKey}`] = item.value;
    }

    if (item.fieldLabel) {
      context[item.fieldLabel] = item.value;
      context[`field.${item.fieldLabel}`] = item.value;
    }
  });

  return context;
}

export function MobileReportA4ViewerPage({
  caseId,
  payload,
  selectedVariantId,
  templates,
  selectedTemplateId = "",
}: MobileReportA4ViewerPageProps) {
  const selectedVariant = getReportVariantById(selectedVariantId);
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ||
    templates[0] ||
    null;

  const shellRef = useRef<HTMLDivElement | null>(null);
  const documentRef = useRef<HTMLDivElement | null>(null);

  const [preparation, setPreparation] = useState<ReportFlowPreparation | null>(null);
  const [documentScale, setDocumentScale] = useState(1);
  const [documentHeight, setDocumentHeight] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
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
        title: "المعاينة غير جاهزة",
        description:
          "لم يتم العثور على تحضير محفوظ لهذا التقرير. ارجع إلى صفحة الجاهزية أو التحضير أولًا.",
        variant: "warning",
      });
      return;
    }

    setPreparation(loaded);
  }, [caseId, selectedVariant.id]);

  const readyHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("variant", selectedVariant.id);

    if (selectedTemplate?.id) {
      params.set("templateId", selectedTemplate.id);
    }

    return `/mobile/counselor/report-2/cases/${encodeURIComponent(caseId)}/ready?${params.toString()}`;
  }, [caseId, selectedTemplate?.id, selectedVariant.id]);

  const preparedPayload = useMemo(
    () => (preparation ? applyReportFlowPreparationToPayload(payload, preparation) : null),
    [payload, preparation],
  );

  const template: any = useMemo(
    () => (preparedPayload ? hydrateTemplate(preparedPayload, selectedTemplate) : null),
    [preparedPayload, selectedTemplate],
  );

  const previewCaseData = useMemo(() => {
    if (!preparedPayload || !preparation) return null;

    return buildPreviewCaseData({
      caseId,
      preparedPayload,
      preparation,
      selectedVariantId: selectedVariant.id,
    });
  }, [caseId, preparation, preparedPayload, selectedVariant.id]);

  const exportContext = useMemo(() => {
    if (!preparedPayload || !previewCaseData) return null;

    return buildExportContext(preparedPayload, previewCaseData);
  }, [preparedPayload, previewCaseData]);

  const reportTitle =
    previewCaseData?.title ||
    preparedPayload?.title ||
    preparedPayload?.caseInfo.title ||
    "تقرير";

  const updateScale = useCallback(() => {
    const shell = shellRef.current;
    const doc = documentRef.current;

    if (!shell || !doc) return;

    const availableWidth = Math.max(280, shell.clientWidth);
    const nextScale = Math.min(1, availableWidth / A4_WIDTH_PX);
    const nextHeight = doc.scrollHeight * nextScale;

    setDocumentScale(Number(nextScale.toFixed(4)));
    setDocumentHeight(Math.ceil(nextHeight));
  }, []);

  useEffect(() => {
    updateScale();

    const shell = shellRef.current;
    const doc = documentRef.current;
    const resizeObserver = new ResizeObserver(updateScale);

    if (shell) resizeObserver.observe(shell);
    if (doc) resizeObserver.observe(doc);

    window.addEventListener("resize", updateScale);

    const fontsReady = (document as any).fonts?.ready;
    if (fontsReady) {
      fontsReady.then(updateScale).catch(() => undefined);
    }

    const timer = window.setTimeout(updateScale, 700);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScale);
      window.clearTimeout(timer);
    };
  }, [preparedPayload, template, previewCaseData, updateScale]);

  async function downloadPdf() {
    if (pdfLoading) return;

    if (!template?.pages?.length || !previewCaseData || !exportContext) {
      setFeedback({
        open: true,
        title: "التقرير غير جاهز",
        description: "لا توجد صفحات A4 جاهزة للتحميل. ارجع للتحضير ثم حاول مرة أخرى.",
        variant: "warning",
      });
      return;
    }

    setPdfLoading(true);

    try {
      const response = await fetch(
        `/api/dashboard/report-2/cases/${encodeURIComponent(caseId)}/export/pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: `${safeFileName(reportTitle)}.pdf`,
            snapshot: {
              template,
              context: exportContext,
              previewCase: previewCaseData,
              designTemplateId: template.designTemplateId || "modern-official",
            },
          }),
        },
      );

      const contentType = response.headers.get("content-type") || "";

      if (response.ok && contentType.includes("application/pdf")) {
        const blob = await response.blob();
        await downloadBlobAsFile(blob, `${safeFileName(reportTitle)}.pdf`);

        setFeedback({
          open: true,
          title: "تم تجهيز التحميل",
          description: "تم إنشاء ملف PDF وبدء تحميله على جهازك.",
          variant: "success",
        });
        return;
      }

      const data = await response.json().catch(() => ({} as Record<string, unknown>));

      if (
        response.ok &&
        data.fallback === "PRINT_PREVIEW" &&
        typeof data.previewUrl === "string"
      ) {
        if (isNativeCapacitor()) {
          const opened = await savePrintPreviewAsNativePdf(
            data.previewUrl,
            `${safeFileName(reportTitle)}.pdf`,
          );
          if (!opened) throw new Error("PRINT_PREVIEW_OPEN_FAILED");
        } else {
          window.open(data.previewUrl, "_blank", "noopener,noreferrer");
        }

        setFeedback({
          open: true,
          title: "تم فتح معاينة الطباعة",
          description:
            "استخدم خيار الطباعة أو الحفظ كـ PDF من المتصفح إذا لم يبدأ التحميل تلقائيًا.",
          variant: "info",
        });
        return;
      }

      throw new Error(
        cleanText((data as any).error) ||
          cleanText((data as any).message) ||
          "تعذر تحميل PDF.",
      );
    } catch (error) {
      setFeedback({
        open: true,
        title: "تعذر تحميل PDF",
        description:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنشاء ملف PDF. حاول مرة أخرى.",
        variant: "error",
      });
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50 text-slate-950"
    >
      <style>{`
        html,
        body {
          background: #f0f9ff;
        }

        .mobile-a4-viewer-frame {
          width: 210mm;
          min-width: 210mm;
          max-width: 210mm;
        }

        .mobile-a4-viewer-frame > section {
          width: 210mm !important;
          max-width: 210mm !important;
          margin: 0 !important;
        }

        .mobile-a4-viewer-frame .pdf-report-page,
        .mobile-a4-viewer-frame [data-report-design-page],
        .mobile-a4-viewer-frame .report-design-page {
          width: 210mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          margin: 0 auto 18px auto !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12) !important;
          background: #ffffff !important;
        }

        .mobile-a4-viewer-frame .pdf-report-page:last-child,
        .mobile-a4-viewer-frame [data-report-design-page]:last-child,
        .mobile-a4-viewer-frame .report-design-page:last-child {
          margin-bottom: 0 !important;
        }

        @media print {
          header,
          .mobile-a4-viewer-actions {
            display: none !important;
          }

          body {
            background: #ffffff !important;
          }

          .mobile-a4-viewer-frame {
            position: static !important;
            width: 210mm !important;
            transform: none !important;
          }

          .mobile-a4-viewer-frame .pdf-report-page,
          .mobile-a4-viewer-frame [data-report-design-page],
          .mobile-a4-viewer-frame .report-design-page {
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page !important;
            page-break-after: always !important;
          }
        }
      `}</style>

      <header className="sticky top-0 z-20 border-b border-sky-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[430px] items-center justify-between gap-2 px-3 py-3">
          <Link
            href={readyHref}
            className="flex h-11 items-center justify-center gap-1 rounded-[1.2rem] bg-sky-50 px-3 text-xs font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
          >
            <MobileIcon name="arrow" className="h-4 w-4" />
            رجوع
          </Link>

          <div className="min-w-0 text-center">
            <p className="text-[11px] font-black text-sky-700">نسخة A4</p>
            <h1 className="truncate text-sm font-black text-slate-950">
              {reportTitle}
            </h1>
          </div>

          <button
            type="button"
            onClick={downloadPdf}
            disabled={pdfLoading || !preparation}
            className="flex h-11 items-center justify-center gap-1 rounded-[1.2rem] bg-sky-600 px-3 text-xs font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pdfLoading ? "جارٍ..." : "تحميل PDF"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[430px] px-3 py-4">
        {preparation && template && previewCaseData && preparedPayload ? (
          <>

            <section
              ref={shellRef}
              className="mx-auto w-full overflow-hidden rounded-[2rem] bg-white/95 p-3 shadow-xl shadow-sky-100 ring-1 ring-sky-100"
            >
              <div
                className="relative mx-auto"
                style={{
                  height: documentHeight ? `${documentHeight}px` : undefined,
                }}
              >
                <div
                  ref={documentRef}
                  className="mobile-a4-viewer-frame absolute left-1/2 top-0"
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
          </>
        ) : (
          <section className="rounded-[1.8rem] bg-white/90 p-5 text-center shadow-sm ring-1 ring-amber-100">
            <p className="text-lg font-black text-slate-950">
              لا توجد معاينة A4 متاحة
            </p>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
              ارجع إلى صفحة الجاهزية أو التحضير ثم احفظ التقرير قبل مراجعة نسخة الطباعة.
            </p>

            <Link
              href={readyHref}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-[1.2rem] bg-sky-600 px-5 text-sm font-black text-white shadow-lg shadow-sky-200"
            >
              العودة للتقرير الجاهز
            </Link>
          </section>
        )}
      </main>

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
    </div>
  );
}
