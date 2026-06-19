"use client";

import { useMemo, useState } from "react";

import type { MobileReportTemplateOption } from "@/components/mobile/mobile-report-prepare-flow";
import { MobileIcon } from "@/components/mobile/mobile-icons";
import { FinalReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";
import type { SmartReportField, SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import { applyReportFlowPreparationToPayload } from "@/lib/report-flow/report-flow-payload";
import type { ReportFlowPreparation } from "@/lib/report-flow/report-flow-types";

type MobileReportA4PreviewProps = {
  caseId: string;
  payload: SmartReportPayload;
  selectedVariantId: string;
  selectedTemplate: MobileReportTemplateOption | null;
  preparation: ReportFlowPreparation;
};

type PreviewMode = "fit" | "large";

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
    name: selectedTemplate?.name || payload.title || "معاينة التقرير",
    designTemplateId: "modern-official",
    pages: [
      {
        id: "mobile-preview-page-1",
        title: "المعاينة",
        kind: "content",
        blocks: [
          {
            id: "mobile-preview-hero",
            kind: "hero-title",
            title: "عنوان التقرير",
            content: "{{case.title}}",
            variant: "hero",
            align: "center",
            showTitle: false,
            placement: "flow",
          },
          {
            id: "mobile-preview-fields",
            kind: "dynamic-fields",
            title: "الحقول المختارة",
            content: "",
            variant: "card",
            align: "right",
            showTitle: true,
            placement: "flow",
          },
          {
            id: "mobile-preview-summary",
            kind: "multi-paragraph",
            title: payload.narrative.title || "وصف التنفيذ",
            content: cleanText(payload.narrative.body) || "لا يوجد وصف تنفيذ محفوظ حتى الآن.",
            variant: "soft",
            align: "right",
            showTitle: true,
            placement: "flow",
          },
          {
            id: "mobile-preview-evidence",
            kind: "evidence-gallery",
            title: "الشواهد",
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
        "معاينة التقرير",
      designTemplateId:
        cleanText(smartStudio.designTemplateId) ||
        cleanText(templateJson?.designTemplateId) ||
        "modern-official",
      designConfig:
        smartStudio.designConfig ||
        (isRecord(templateJson) ? templateJson.designConfig : undefined),
    };
  }

  if (isRecord(templateJson) && Array.isArray(templateJson.pages) && templateJson.pages.length) {
    return {
      ...templateJson,
      name:
        cleanText(templateJson.name) ||
        selectedTemplate?.name ||
        payload.title ||
        "معاينة التقرير",
      designTemplateId:
        cleanText(templateJson.designTemplateId) || "modern-official",
    };
  }

  return buildFallbackTemplate(payload, selectedTemplate);
}

export function MobileReportA4Preview({
  caseId,
  payload,
  selectedVariantId,
  selectedTemplate,
  preparation,
}: MobileReportA4PreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("fit");

  const preparedPayload = useMemo(
    () => applyReportFlowPreparationToPayload(payload, preparation),
    [payload, preparation],
  );

  const template: any = useMemo(
    () => hydrateTemplate(preparedPayload, selectedTemplate),
    [preparedPayload, selectedTemplate],
  );

  const previewCaseData = useMemo(() => {
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
        "تقرير ٢",
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
  }, [caseId, preparedPayload, preparation.updatedAt, selectedVariantId]);

  const pages = Array.isArray(template?.pages) ? template.pages : [];
  const pagesCount = pages.length;
  const previewShellWidthClass =
    previewMode === "fit" ? "w-full" : "w-[210mm] min-w-[210mm]";

  return (
    <div className="space-y-3">
      <section className="rounded-[1.35rem] bg-sky-50/90 p-3 ring-1 ring-sky-100">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[1rem] bg-white/90 p-2.5 ring-1 ring-sky-100">
            <p className="text-[10px] font-black text-sky-700">التقرير</p>
            <p className="mt-1 text-xs font-black leading-6 text-slate-950">
              {preparedPayload.title || preparedPayload.caseInfo.title || "تقرير ٢"}
            </p>
          </div>

          <div className="rounded-[1rem] bg-white/90 p-2.5 ring-1 ring-sky-100">
            <p className="text-[10px] font-black text-sky-700">القالب</p>
            <p className="mt-1 text-xs font-black leading-6 text-slate-950">
              {selectedTemplate?.name || "معاينة افتراضية"}
            </p>
          </div>

          <div className="rounded-[1rem] bg-white/90 p-2.5 ring-1 ring-sky-100">
            <p className="text-[10px] font-black text-sky-700">الصفحات</p>
            <p className="mt-1 text-xs font-black leading-6 text-slate-950">
              {pagesCount > 0 ? `${pagesCount} صفحة` : "معاينة"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.6rem] bg-gradient-to-b from-sky-50/95 to-white p-3 shadow-sm ring-1 ring-sky-100">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-950">معاينة A4 للجوال</h3>
            <p className="mt-1 text-[11px] font-bold leading-6 text-slate-500">
              اختر المقاس الأنسب للقراءة ثم راجع الصفحات داخل نفس المسار المحمول.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode("fit")}
              className={[
                "flex h-10 items-center justify-center gap-1 rounded-[1rem] px-3 text-xs font-black transition",
                previewMode === "fit"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-200"
                  : "bg-white text-sky-700 ring-1 ring-sky-100 hover:bg-sky-50",
              ].join(" ")}
            >
              ملاءمة
            </button>

            <button
              type="button"
              onClick={() => setPreviewMode("large")}
              className={[
                "flex h-10 items-center justify-center gap-1 rounded-[1rem] px-3 text-xs font-black transition",
                previewMode === "large"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-200"
                  : "bg-white text-sky-700 ring-1 ring-sky-100 hover:bg-sky-50",
              ].join(" ")}
            >
              كبير
            </button>
          </div>
        </div>

        <div
          className={[
            "rounded-[1.4rem] bg-sky-100/50 p-2 ring-1 ring-white/90",
            previewMode === "large"
              ? "overflow-x-auto overscroll-x-contain"
              : "overflow-hidden",
          ].join(" ")}
        >
          <div className="mx-auto flex justify-center">
            <div className={previewShellWidthClass}>
              <div className="rounded-[1.25rem] bg-white/80 p-2 ring-1 ring-sky-100">
                <FinalReportDesignRenderer
                  template={template}
                  previewCaseData={previewCaseData}
                  identity={{
                    ...preparedPayload.identity,
                    semester:
                      cleanText(preparedPayload.identity.currentSemester) ||
                      cleanText(preparedPayload.identity.academicYear),
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {previewMode === "large" ? (
          <div className="mt-3 flex items-start gap-2 rounded-[1.15rem] bg-white/80 p-3 text-xs font-bold leading-6 text-slate-600 ring-1 ring-sky-100">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <MobileIcon name="arrow" className="h-4 w-4 rotate-180" />
            </span>
            <p>
              الوضع الكبير يعرض صفحة A4 بعرضها الأقرب للطباعة. اسحب أفقيًا داخل بطاقة المعاينة عند الحاجة.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
