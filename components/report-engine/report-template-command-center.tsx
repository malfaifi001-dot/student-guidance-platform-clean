"use client";

import type {
  ReportTemplateBuilderModel,
  ReportTemplatePage,
} from "@/lib/report-engine/report-template-builder-types";
import type {
  RuntimePreviewCaseData,
  RuntimeWorkflowFieldOption,
} from "@/lib/report-engine/report-template-runtime-types";

type EvidencePlacement = "INLINE" | "END_PAGES";
type EvidenceLayout = "ONE_PER_PAGE" | "TWO_PER_PAGE" | "GRID_2X2";
type EvidenceImageFit = "CONTAIN" | "COVER";

type EvidenceSettings = {
  enabled: boolean;
  placement: EvidencePlacement;
  layout: EvidenceLayout;
  showCaptions: boolean;
  imageFit: EvidenceImageFit;
};

type SmartTemplate = ReportTemplateBuilderModel & {
  evidenceSettings?: Partial<EvidenceSettings>;
  workflowType?: string;
  locationKey?: string;
};

const statusLabels: Record<string, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

const scopeLabels: Record<string, string> = {
  GLOBAL: "عام لكل المنصة",
  SERVICE: "موجه لخدمة",
  WORKFLOW: "موجه لـ Workflow",
  LOCATION: "موجه لمكان محدد",
};

const pageKindLabels: Record<string, string> = {
  cover: "غلاف",
  summary: "ملخص",
  narrative: "محتوى",
  results: "نتائج",
  evidence: "شواهد",
  approval: "اعتماد",
  letter: "خطاب",
};

const evidenceLayoutLabels: Record<EvidenceLayout, string> = {
  ONE_PER_PAGE: "شاهد واحد لكل صفحة",
  TWO_PER_PAGE: "شاهدان جنب بعض",
  GRID_2X2: "أربعة شواهد في الصفحة",
};

function getEvidenceSettings(template: SmartTemplate): EvidenceSettings {
  return {
    enabled: template.evidenceSettings?.enabled ?? hasEvidencePage(template.pages),
    placement: (template.evidenceSettings?.placement as EvidencePlacement) || "END_PAGES",
    layout: (template.evidenceSettings?.layout as EvidenceLayout) || "TWO_PER_PAGE",
    showCaptions: template.evidenceSettings?.showCaptions ?? true,
    imageFit: (template.evidenceSettings?.imageFit as EvidenceImageFit) || "CONTAIN",
  };
}

function hasEvidencePage(pages: ReportTemplatePage[]) {
  return pages.some(
    (page) =>
      page.kind === "evidence" ||
      page.blocks.some((block) => block.kind === "evidence-gallery"),
  );
}

function countBlocks(pages: ReportTemplatePage[]) {
  return pages.reduce((total, page) => total + page.blocks.length, 0);
}

function getReadinessChecks(params: {
  template: SmartTemplate;
  workflowFields: RuntimeWorkflowFieldOption[];
  previewCase: RuntimePreviewCaseData | null;
}) {
  const { template, workflowFields, previewCase } = params;
  const evidence = getEvidenceSettings(template);

  const checks = [
    {
      ok: Boolean(template.name?.trim()),
      label: "اسم القالب مكتمل",
    },
    {
      ok: template.pages.length > 0,
      label: "يوجد صفحات داخل القالب",
    },
    {
      ok: countBlocks(template.pages) > 0,
      label: "يوجد محتوى قابل للعرض",
    },
    {
      ok:
        template.scope === "GLOBAL" ||
        Boolean(template.serviceSlug || template.workflowType || template.locationKey),
      label: "توجيه القالب واضح",
    },
    {
      ok: Boolean(template.previewCaseId?.trim() && previewCase),
      label: "تم اختبار القالب على Case ID فعلي",
    },
    {
      ok:
        template.scope !== "WORKFLOW" ||
        workflowFields.length > 0 ||
        Boolean(template.serviceSlug),
      label: "حقول الـ Workflow متاحة أو الخدمة محددة",
    },
    {
      ok: !evidence.enabled || hasEvidencePage(template.pages),
      label: "إعدادات الشواهد مرتبطة بصفحة شواهد",
    },
  ];

  return checks;
}

export function ReportTemplateCommandCenter({
  template,
  workflowFields,
  workflowMessage,
  previewCase,
  previewMessage,
  onTemplateChange,
}: {
  template: ReportTemplateBuilderModel;
  workflowFields: RuntimeWorkflowFieldOption[];
  workflowMessage: string;
  previewCase: RuntimePreviewCaseData | null;
  previewMessage: string;
  onTemplateChange: (updater: (template: ReportTemplateBuilderModel) => ReportTemplateBuilderModel) => void;
}) {
  const smartTemplate = template as SmartTemplate;
  const evidence = getEvidenceSettings(smartTemplate);
  const blocksCount = countBlocks(template.pages);
  const checks = getReadinessChecks({
    template: smartTemplate,
    workflowFields,
    previewCase,
  });
  const passedChecks = checks.filter((check) => check.ok).length;

  function updateEvidenceSettings(next: Partial<EvidenceSettings>) {
    onTemplateChange((currentTemplate) => {
      const current = currentTemplate as SmartTemplate;
      const currentEvidence = getEvidenceSettings(current);

      return {
        ...currentTemplate,
        evidenceSettings: {
          ...currentEvidence,
          ...next,
        },
        updatedAt: new Date().toISOString().slice(0, 10),
      } as ReportTemplateBuilderModel;
    });
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-white p-5 shadow-sm" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-700">لوحة قيادة القالب</p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            أنت الآن داخل: {template.name}
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
            هذه اللوحة توضح مكانك داخل الاستديو، وما الذي تعدله، وهل القالب جاهز
            للاختبار والنشر. التصميم الرسمي ثابت، والتعديل يكون على النصوص
            والمتغيرات والتوجيه والشواهد.
          </p>
        </div>

        <div className="grid min-w-72 gap-2 sm:grid-cols-3 xl:grid-cols-1">
          <MetricCard label="الحالة" value={statusLabels[template.status] || template.status} />
          <MetricCard label="الصفحات" value={`${template.pages.length}`} />
          <MetricCard label="الجاهزية" value={`${passedChecks}/${checks.length}`} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-black text-slate-900">هوية وتوجيه القالب</h3>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <InfoRow label="نوع التصميم" value={smartTemplate.designPreset || "تصميم افتراضي"} />
            <InfoRow label="نوع المستند" value={String(smartTemplate.documentType || "REPORT")} />
            <InfoRow label="التوجيه" value={scopeLabels[template.scope] || template.scope} />
            <InfoRow label="الخدمة" value={template.serviceSlug || "غير محددة"} />
            <InfoRow label="Workflow" value={smartTemplate.workflowType || "غير محدد"} />
            <InfoRow label="مكان مخصص" value={smartTemplate.locationKey || "غير محدد"} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-black text-slate-900">اختبار Case ID</h3>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <InfoRow label="Case ID" value={template.previewCaseId || "لم يتم إدخاله"} />
            <InfoRow
              label="نتيجة الجلب"
              value={previewCase ? "تم تحميل حالة فعلية" : "بيانات تجريبية أو غير محملة"}
            />
            <InfoRow label="عدد حقول Workflow" value={`${workflowFields.length}`} />
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">
            {previewMessage || workflowMessage || "أدخل Case ID داخل بيانات القالب ثم راقب المعاينة قبل النشر."}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-black text-slate-900">تنبيهات الجاهزية</h3>

          <div className="mt-4 space-y-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-xs font-black ${
                  check.ok
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                <span>{check.label}</span>
                <span>{check.ok ? "جاهز" : "يحتاج مراجعة"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-900">خريطة القالب</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
              {blocksCount} بلوك
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {template.pages.map((page, index) => (
              <div
                key={page.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm font-black text-slate-900">
                    {index + 1}. {page.title}
                  </strong>

                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                    {pageKindLabels[page.kind] || page.kind}
                  </span>
                </div>

                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {page.description || "بدون وصف"}
                </p>

                <div className="mt-2 flex flex-wrap gap-1">
                  {page.blocks.map((block) => (
                    <span
                      key={block.id}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500"
                    >
                      {block.title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">إعدادات الشواهد</h3>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                يتحكم القالب في طريقة عرض الشواهد داخل التقرير الرسمي.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
              <input
                type="checkbox"
                checked={evidence.enabled}
                onChange={(event) =>
                  updateEvidenceSettings({ enabled: event.target.checked })
                }
              />
              تفعيل الشواهد
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FieldLabel title="مكان عرض الشواهد">
              <select
                value={evidence.placement}
                disabled={!evidence.enabled}
                onChange={(event) =>
                  updateEvidenceSettings({
                    placement: event.target.value as EvidencePlacement,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                <option value="END_PAGES">صفحات مستقلة آخر التقرير</option>
                <option value="INLINE">داخل محتوى التقرير</option>
              </select>
            </FieldLabel>

            <FieldLabel title="تخطيط الشواهد">
              <select
                value={evidence.layout}
                disabled={!evidence.enabled}
                onChange={(event) =>
                  updateEvidenceSettings({
                    layout: event.target.value as EvidenceLayout,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                <option value="ONE_PER_PAGE">شاهد واحد لكل صفحة</option>
                <option value="TWO_PER_PAGE">شاهدان جنب بعض</option>
                <option value="GRID_2X2">أربعة شواهد في الصفحة</option>
              </select>
            </FieldLabel>

            <FieldLabel title="عرض الصورة">
              <select
                value={evidence.imageFit}
                disabled={!evidence.enabled}
                onChange={(event) =>
                  updateEvidenceSettings({
                    imageFit: event.target.value as EvidenceImageFit,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                <option value="CONTAIN">احتواء الصورة بالكامل</option>
                <option value="COVER">قص الصورة لتعبئة الإطار</option>
              </select>
            </FieldLabel>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
              <span>إظهار التعليقات أسفل الشواهد</span>
              <input
                type="checkbox"
                checked={evidence.showCaptions}
                disabled={!evidence.enabled}
                onChange={(event) =>
                  updateEvidenceSettings({ showCaptions: event.target.checked })
                }
              />
            </label>
          </div>

          <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-bold leading-6 text-emerald-700">
            الوضع الحالي: {evidence.enabled ? evidenceLayoutLabels[evidence.layout] : "الشواهد مخفية"}.
            {evidence.enabled && evidence.placement === "END_PAGES"
              ? " سيتم فصل الشواهد في صفحات A4 مستقلة حتى لا تتمدد صفحة التقرير."
              : ""}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="text-left font-black text-slate-900">{value}</span>
    </div>
  );
}

function FieldLabel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-500">
        {title}
      </span>
      {children}
    </label>
  );
}
