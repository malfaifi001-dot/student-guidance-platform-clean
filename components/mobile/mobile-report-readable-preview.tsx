"use client";

import { useMemo } from "react";

import type { MobileReportTemplateOption } from "@/components/mobile/mobile-report-prepare-flow";
import type { SmartReportField, SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import { applyReportFlowPreparationToPayload } from "@/lib/report-flow/report-flow-payload";
import type {
  ReportFlowPreparation,
  ReportFlowPrepareField,
} from "@/lib/report-flow/report-flow-types";

type MobileReportReadablePreviewProps = {
  caseId: string;
  payload: SmartReportPayload;
  selectedVariantId: string;
  selectedTemplate: MobileReportTemplateOption | null;
  preparation: ReportFlowPreparation;
};

type PreviewField = {
  id: string;
  label: string;
  value: string;
  tone: "compact" | "paragraph";
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "غير محدد";
  }
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

function looksLikeJson(value: string) {
  const normalized = value.trim();

  if (!normalized) return false;

  if (
    (normalized.startsWith("{") && normalized.endsWith("}")) ||
    (normalized.startsWith("[") && normalized.endsWith("]"))
  ) {
    return true;
  }

  return normalized.includes('":') || normalized.includes("},") || normalized.includes('],"');
}

function isTechnicalField(field: Pick<ReportFlowPrepareField, "key" | "label" | "value" | "technical">) {
  if (field.technical) return true;

  const source = `${cleanText(field.key)} ${cleanText(field.label)}`.toLowerCase();

  if (
    /(^__|__other|token|signature[_-]?url|raw|json|payload|debug|internal|checksum|hash|blob|metadata|trace)/i.test(
      source,
    )
  ) {
    return true;
  }

  return looksLikeJson(cleanText(field.value));
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(url);
}

function buildPreviewFields(fields: ReportFlowPrepareField[]): PreviewField[] {
  return fields
    .filter((field) => field.selected)
    .filter((field) => cleanText(field.label) && cleanText(field.value))
    .filter((field) => !isTechnicalField(field))
    .map((field) => {
      const value = cleanText(field.value);

      return {
        id: field.id,
        label: cleanText(field.label),
        value,
        tone: value.length > 90 || value.includes("\n") ? "paragraph" : "compact",
      };
    });
}

function buildStudentRows(student: SmartReportPayload["student"]) {
  if (!student) return [];

  return [
    { id: "name", label: "الطالب", value: cleanText(student.name) },
    { id: "grade", label: "الصف", value: cleanText(student.grade) },
    { id: "classroom", label: "الفصل", value: cleanText(student.classroom) },
    { id: "stage", label: "المرحلة", value: cleanText(student.stage) },
    { id: "guardianName", label: "ولي الأمر", value: cleanText(student.guardianName) },
    { id: "guardianPhone", label: "رقم التواصل", value: cleanText(student.guardianPhone) },
  ].filter((item) => item.value);
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-black text-sky-700">{eyebrow}</p>
      <h3 className="mt-1 text-base font-black text-slate-950">{title}</h3>
    </div>
  );
}

export function MobileReportReadablePreview({
  caseId,
  payload,
  preparation,
}: MobileReportReadablePreviewProps) {
  const preparedPayload = useMemo(
    () => applyReportFlowPreparationToPayload(payload, preparation),
    [payload, preparation],
  );

  const selectedFields = useMemo(
    () => buildPreviewFields(preparation.fields),
    [preparation.fields],
  );

  const studentRows = useMemo(
    () => buildStudentRows(preparedPayload.student),
    [preparedPayload.student],
  );

  const evidenceItems = useMemo(
    () =>
      preparedPayload.evidence.items.map((item, index) => {
        const title =
          cleanText(item.title) || cleanText(item.caption) || `شاهد ${index + 1}`;
        const url = cleanText(item.url);
        const image = item.type === "IMAGE" || isImageUrl(url);

        return {
          id: item.id || `evidence-${index + 1}`,
          title,
          caption: cleanText(item.caption),
          url,
          image,
        };
      }),
    [preparedPayload.evidence.items],
  );

  const summaryText =
    cleanText(preparedPayload.narrative.body) || "لا يوجد وصف تنفيذ محفوظ حتى الآن.";
return (
    <div className="space-y-4 pb-6">
{studentRows.length ? (
        <section className="rounded-[1.7rem] bg-white/95 p-4 shadow-sm ring-1 ring-sky-100">
          <SectionHeading eyebrow="الطالب" title="ملخص الحالة التعليمية" />

          <div className="space-y-2.5">
            {studentRows.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.25rem] bg-sky-50/65 p-3 ring-1 ring-sky-100"
              >
                <p className="text-[11px] font-black text-sky-700">{item.label}</p>
                <p className="mt-1 text-sm font-black leading-7 text-slate-950">{item.value}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.7rem] bg-white/95 p-4 shadow-sm ring-1 ring-sky-100">
        <SectionHeading eyebrow="البيانات المختارة" title="محتوى التقرير" />

        {selectedFields.length ? (
          <div className="space-y-2.5">
            {selectedFields.map((field) =>
              field.tone === "paragraph" ? (
                <article
                  key={field.id}
                  className="rounded-[1.35rem] bg-sky-50/75 p-4 ring-1 ring-sky-100"
                >
                  <p className="text-[11px] font-black text-sky-700">{field.label}</p>
                  <p className="mt-2 text-sm font-bold leading-8 text-slate-800">
                    {field.value}
                  </p>
                </article>
              ) : (
                <article
                  key={field.id}
                  className="rounded-[1.35rem] bg-slate-50/90 p-3 ring-1 ring-slate-100"
                >
                  <p className="text-[11px] font-black text-slate-500">{field.label}</p>
                  <p className="mt-1 text-sm font-black leading-7 text-slate-950">
                    {field.value}
                  </p>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="rounded-[1.35rem] bg-amber-50/90 p-4 ring-1 ring-amber-100">
            <p className="text-sm font-black text-amber-900">لا توجد حقول جاهزة للعرض</p>
            <p className="mt-2 text-sm font-bold leading-7 text-amber-800">
              ارجع إلى تعديل البيانات لاختيار الحقول التي تريد ظهورها في التقرير.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[1.7rem] bg-white/95 p-4 shadow-sm ring-1 ring-sky-100">
        <SectionHeading
          eyebrow="وصف التنفيذ"
          title={cleanText(preparedPayload.narrative.title) || "ملخص التنفيذ"}
        />

        <div className="rounded-[1.35rem] bg-sky-50/75 p-4 ring-1 ring-sky-100">
          <p className="text-sm font-bold leading-8 text-slate-800">{summaryText}</p>
        </div>
      </section>

      <section className="rounded-[1.7rem] bg-white/95 p-4 shadow-sm ring-1 ring-sky-100">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-black text-sky-700">الشواهد</p>
            <h3 className="mt-1 text-base font-black text-slate-950">المرفقات الداعمة</h3>
          </div>

          <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black text-sky-700 ring-1 ring-sky-100">
            {evidenceItems.length} شاهد
          </span>
        </div>

        {evidenceItems.length ? (
          <div className="space-y-3">
            {evidenceItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-[1.35rem] bg-slate-50/90 ring-1 ring-slate-100"
              >
                {item.image && item.url ? (
                  <div className="bg-sky-50">
                    <img
                      src={item.url}
                      alt={item.title}
                      className="h-44 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-sky-50/80 px-4 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-sky-100">
                      <span className="text-xs font-black">ملف</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">{item.title}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        مرفق جاهز للمراجعة
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3">
                  <p className="text-sm font-black text-slate-950">{item.title}</p>
                  {item.caption ? (
                    <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                      {item.caption}
                    </p>
                  ) : null}
                  {item.url && !item.image ? (
                    <p className="mt-2 break-all text-[11px] font-bold leading-6 text-sky-700">
                      {item.url}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.35rem] bg-slate-50 p-4 text-center text-sm font-bold leading-7 text-slate-500 ring-1 ring-slate-100">
            لا توجد شواهد مضافة لهذا التقرير حتى الآن.
          </div>
        )}
      </section>
</div>
  );
}
