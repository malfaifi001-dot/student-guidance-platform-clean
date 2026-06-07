"use client";

import type { ReactNode } from "react";
import type {
  ReportTemplateBlock,
  ReportTemplateBuilderModel,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";
import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";
import { GuardianSummonsLetterPreview } from "@/components/report-engine/guardian-summons-letter-preview";
import { AppreciationCertificatePreview } from "@/components/report-engine/appreciation-certificate-preview";
import {
  resolveTextLibraryFallback,
  resolveTextLibrarySnippets,
  type RuntimeReportData,
} from "@/lib/report-engine/report-text-library-runtime";

type ReportTemplateLivePreviewProps = {
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
  pdfMode?: boolean;
};

type RuntimeValueItem = {
  fieldKey?: string | null;
  fieldLabel?: string | null;
  value?: string | null;
};

type RuntimeEvidenceItem = {
  id?: string | null;
  title?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  imageUrl?: string | null;
  mimeType?: string | null;
  caption?: string | null;
  description?: string | null;
};

export function ReportTemplateLivePreview({
  template,
  snippets,
  previewCaseData,
  pdfMode = false,
}: ReportTemplateLivePreviewProps) {
  const designPreset = String(
    (template as { designPreset?: string | null }).designPreset || ""
  );
  if (designPreset === "guardian-summons-letter-v1") {
    return (
      <GuardianSummonsLetterPreview
        template={template}
        previewCaseData={previewCaseData}
        pdfMode={pdfMode}
        snippets={snippets}
      />
    );
  }

  if (designPreset === "appreciation-certificate-v1") {
    return (
      <AppreciationCertificatePreview
        template={template}
        previewCaseData={previewCaseData}
        pdfMode={pdfMode}
        showDynamicFields={!pdfMode}
      />
    );
  }
  return (
    <section
      className={
        pdfMode
          ? "bg-white p-0"
          : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      {!pdfMode ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              المعاينة الحية للقالب
            </h2>

            <p className="mt-1 text-sm leading-7 text-slate-500">
              هذه المعاينة تقرأ صفحات القالب وبلوكاته، وتستخدم بيانات Case ID إن وجدت،
              وتعرض نصوص مكتبة النصوص حسب إعدادات بلوك النصوص.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-600">
            {previewCaseData ? "معاينة من Case حقيقي" : "معاينة ببيانات تجريبية"}
          </div>
        </div>
      ) : null}

      <div className={pdfMode ? "space-y-0" : "mt-5 space-y-6"}>
        {template.pages.map((page, pageIndex) => (
          <article
            key={page.id}
            style={
              pdfMode
                ? {
                    width: "210mm",
                    height: "297mm",
                    maxHeight: "297mm",
                    overflow: "hidden",
                    breakAfter:
                      pageIndex < template.pages.length - 1 ? "page" : "auto",
                    pageBreakAfter:
                      pageIndex < template.pages.length - 1 ? "always" : "auto",
                    breakInside: "avoid",
                    pageBreakInside: "avoid",
                  }
                : undefined
            }
            className={
              pdfMode
                ? "pdf-report-page mx-auto max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none"
                : "mx-auto min-h-[720px] max-w-[820px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm"
            }
          >
            {!pdfMode ? (
              <div className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-emerald-700">
                      صفحة {pageIndex + 1}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      {page.title}
                    </h3>

                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      {page.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                    {getPageKindLabel(page.kind)}
                  </span>
                </div>
              </div>
            ) : null}

            <div
              className={[
                pdfMode
                  ? "h-full max-h-full overflow-hidden bg-white p-[10mm]"
                  : "min-h-[640px] bg-white p-8",
                page.kind === "cover" ? "flex flex-col justify-between" : "",
              ].join(" ")}
            >
              {page.kind === "cover" ? (
                <CoverPreviewHeader template={template} pageTitle={page.title} />
              ) : null}

              <div className={pdfMode ? "max-h-full space-y-3 overflow-hidden" : "space-y-5"}>
                {page.blocks.length ? (
                  page.blocks.map((block) => (
                    <PreviewBlock
                      key={block.id}
                      block={block}
                      template={template}
                      snippets={snippets}
                      previewCaseData={previewCaseData}
                    />
                  ))
                ) : !pdfMode ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-bold text-slate-500">
                      لا توجد بلوكات في هذه الصفحة.
                    </p>
                  </div>
                ) : null}
              </div>

              {page.kind === "cover" ? (
                <CoverPreviewFooter template={template} />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PreviewBlock({
  block,
  template,
  snippets,
  previewCaseData,
}: {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
}) {
  if (block.kind === "identity-header") {
    return (
      <BlockShell block={block}>
        <div className="grid gap-3 md:grid-cols-3">
          <InfoPreview label="الجهة" value="وزارة التعليم" />
          <InfoPreview label="المدرسة" value="اسم المدرسة" />
          <InfoPreview label="العام الدراسي" value="1447هـ" />
        </div>
      </BlockShell>
    );
  }

  if (block.kind === "cover-title") {
    return (
      <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8 text-center">
        {shouldShowTitle(block) ? (
          <p className="text-sm font-black text-emerald-700">
            {getServiceName(template, previewCaseData)}
          </p>
        ) : null}

        <h1 className="mt-3 text-3xl font-black text-slate-900">
          {template.name}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-slate-600">
          {template.description}
        </p>
      </div>
    );
  }

  if (block.kind === "case-meta") {
    return (
      <BlockShell block={block}>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoPreview
            label="عنوان الحالة"
            value={getCaseTitle(previewCaseData)}
          />
          <InfoPreview
            label="الخدمة"
            value={getServiceName(template, previewCaseData)}
          />
          <InfoPreview
            label="عدد القيم"
            value={`${getRuntimeValues(previewCaseData).length}`}
          />
          <InfoPreview
            label="عدد الشواهد"
            value={`${getRuntimeEvidences(previewCaseData).length}`}
          />
        </div>
      </BlockShell>
    );
  }

  if (block.kind === "student-summary") {
    const student = getStudent(previewCaseData);

    return (
      <BlockShell block={block}>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoPreview
            label="اسم الطالب/الطالبة"
            value={student.fullName || "اسم الطالب/الطالبة"}
          />
          <InfoPreview label="المرحلة" value={student.stage || "غير محدد"} />
          <InfoPreview label="الصف" value={student.grade || "غير محدد"} />
          <InfoPreview label="الفصل" value={student.classroom || "غير محدد"} />
          <InfoPreview
            label="ولي الأمر"
            value={student.guardianName || "غير متوفر"}
          />
          <InfoPreview
            label="جوال ولي الأمر"
            value={student.guardianPhone || "غير متوفر"}
          />
        </div>
      </BlockShell>
    );
  }

  if (block.kind === "service-summary") {
    return (
      <BlockShell block={block}>
        <div className="grid gap-3 md:grid-cols-2">
          <InfoPreview
            label="اسم الخدمة"
            value={getServiceName(template, previewCaseData)}
          />
          <InfoPreview
            label="نطاق القالب"
            value={template.scope === "GLOBAL" ? "عام" : "خاص بخدمة"}
          />
          <InfoPreview label="حالة القالب" value={template.status} />
          <InfoPreview label="عدد الصفحات" value={`${template.pages.length}`} />
        </div>
      </BlockShell>
    );
  }

  if (block.kind === "paragraph") {
    return (
      <BlockShell block={block}>
        <p className="text-sm leading-8 text-slate-700">
          هذا بلوك نصي افتراضي يمكن استخدامه لعرض محتوى وصفي داخل التقارير. يمكن
          لاحقًا ربطه ببيانات الحالة أو جعله فقرة ثابتة داخل القالب.
        </p>
      </BlockShell>
    );
  }

  if (block.kind === "field-list") {
    const values = getRuntimeValues(previewCaseData);

    return (
      <BlockShell block={block}>
        {values.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {values.slice(0, 10).map((item, index) => (
              <InfoPreview
                key={`${item.fieldKey || item.fieldLabel || index}`}
                label={item.fieldLabel || item.fieldKey || `قيمة ${index + 1}`}
                value={item.value || "—"}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
            لا توجد قيم حقيقية من Case ID، سيتم عرض القيم عند ربط حالة حقيقية.
          </div>
        )}
      </BlockShell>
    );
  }

  if (block.kind === "text-library") {
    const runtimeData = buildRuntimeReportDataForTextLibrary(
      template,
      previewCaseData,
    );

    const resolvedSnippets = resolveTextLibrarySnippets({
      block,
      template,
      snippets,
      data: runtimeData,
    });

    if (!resolvedSnippets.length) {
      const fallback = resolveTextLibraryFallback({ block });

      if (!fallback) {
        return null;
      }

      return (
        <BlockShell block={block} tone="emerald">
          <p className="whitespace-pre-line rounded-2xl border border-emerald-100 bg-white p-4 text-sm leading-8 text-slate-800">
            {fallback}
          </p>
        </BlockShell>
      );
    }

    return (
      <BlockShell block={block} tone="emerald">
        <div className="space-y-3">
          {resolvedSnippets.map((snippet) => (
            <article
              key={snippet.id}
              className="rounded-2xl border border-emerald-100 bg-white p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                  {snippet.category}
                </span>

                <strong className="text-xs text-slate-500">
                  {snippet.title}
                </strong>
              </div>

              <p className="whitespace-pre-line text-sm leading-8 text-slate-800">
                {snippet.renderedText}
              </p>
            </article>
          ))}
        </div>
      </BlockShell>
    );
  }

  if (block.kind === "custom-paragraph") {
    return (
      <BlockShell block={block}>
        {block.customTitle ? (
          <h4 className="mb-3 text-base font-black text-slate-900">
            {block.customTitle}
          </h4>
        ) : null}

        <p className="whitespace-pre-line text-sm leading-8 text-slate-700">
          {block.customContent || "لم يتم إدخال محتوى مخصص بعد."}
        </p>
      </BlockShell>
    );
  }

  if (block.kind === "evidence-gallery") {
    const evidences = getRuntimeEvidences(previewCaseData);
    const settings = block.settings || {};
    const layout = settings.evidenceLayout || "grid-2x2";

    return (
      <BlockShell block={block}>
        {evidences.length ? (
          <EvidencePreviewGrid
            evidences={evidences}
            layout={layout}
            showCaptions={settings.showCaptions !== false}
            imageFit={settings.imageFit || "cover"}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
            لا توجد شواهد في المعاينة الحالية.
          </div>
        )}
      </BlockShell>
    );
  }

  if (block.kind === "approval-signature") {
    return (
      <BlockShell block={block}>
        <div className="grid gap-4 md:grid-cols-2">
          <SignatureBox title="الموجه/الموجهة الطلابية" name="أ. الموجه الطلابي" />
          <SignatureBox title="قائد/قائدة المدرسة" name="قائد/قائدة المدرسة" />
        </div>
      </BlockShell>
    );
  }

  return (
    <BlockShell block={block}>
      <p className="text-sm text-slate-500">
        نوع البلوك غير مدعوم في المعاينة الحالية.
      </p>
    </BlockShell>
  );
}

function BlockShell({
  block,
  tone = "slate",
  children,
}: {
  block: ReportTemplateBlock;
  tone?: "slate" | "emerald";
  children: ReactNode;
}) {
  const settings = block.settings || {};
  const showTitle = settings.showTitle !== false;
  const style = settings.style || "card";

  if (style === "plain") {
    return (
      <section>
        {showTitle ? (
          <h4 className="mb-3 text-base font-black text-slate-900">
            {block.title}
          </h4>
        ) : null}

        {children}
      </section>
    );
  }

  if (style === "highlight") {
    return (
      <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
        {showTitle ? (
          <h4 className="mb-3 text-base font-black text-amber-950">
            {block.title}
          </h4>
        ) : null}

        {children}
      </section>
    );
  }

  return (
    <section
      className={[
        "rounded-3xl border p-5",
        tone === "emerald"
          ? "border-emerald-100 bg-emerald-50"
          : "border-slate-200 bg-slate-50",
      ].join(" ")}
    >
      {showTitle ? (
        <h4
          className={[
            "mb-3 text-base font-black",
            tone === "emerald" ? "text-emerald-950" : "text-slate-900",
          ].join(" ")}
        >
          {block.title}
        </h4>
      ) : null}

      {children}
    </section>
  );
}

function InfoPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black leading-7 text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

function SignatureBox({ title, name }: { title: string; name: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-black text-slate-500">{title}</p>
      <p className="mt-3 text-sm font-black text-slate-900">{name}</p>
      <div className="mt-8 border-t border-dashed border-slate-300 pt-3 text-xs text-slate-400">
        التوقيع والختم
      </div>
    </div>
  );
}

function CoverPreviewHeader({
  template,
  pageTitle,
}: {
  template: ReportTemplateBuilderModel;
  pageTitle: string;
}) {
  return (
    <header className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-sm font-black text-emerald-800">
        شعار
      </div>

      <p className="mt-4 text-sm font-black text-emerald-700">
        {getServiceName(template, null)}
      </p>

      <h1 className="mt-3 text-3xl font-black text-slate-900">
        {template.name || pageTitle}
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-slate-600">
        {template.description}
      </p>
    </header>
  );
}

function CoverPreviewFooter({
  template,
}: {
  template: ReportTemplateBuilderModel;
}) {
  return (
    <footer className="no-print border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-500">
      <span>{template.scope === "GLOBAL" ? "قالب عام" : "قالب خاص بخدمة"}</span>
      <span className="mx-2">•</span>
      <span>{template.status}</span>
    </footer>
  );
}

function EvidencePreviewGrid({
  evidences,
  layout,
  showCaptions,
  imageFit,
}: {
  evidences: RuntimeEvidenceItem[];
  layout: string;
  showCaptions: boolean;
  imageFit: string;
}) {
  const gridClass =
    layout === "one-per-page"
      ? "grid-cols-1"
      : layout === "stacked"
        ? "grid-cols-1"
        : layout === "two-columns"
          ? "grid-cols-2"
          : "grid-cols-2";

  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {evidences
        .slice(0, layout === "one-per-page" ? 1 : 4)
        .map((evidence, index) => {
          const imageUrl = evidence.imageUrl || evidence.fileUrl || "";

          return (
            <article
              key={evidence.id || `${evidence.fileName}-${index}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex h-40 items-center justify-center bg-slate-100">
                {isImageEvidence(evidence) && imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={evidence.title || evidence.fileName || "شاهد"}
                    className={[
                      "h-full w-full",
                      imageFit === "contain" ? "object-contain" : "object-cover",
                    ].join(" ")}
                  />
                ) : (
                  <span className="px-4 text-center text-xs font-black text-slate-500">
                    {evidence.fileName || "مرفق"}
                  </span>
                )}
              </div>

              {showCaptions ? (
                <div className="p-3">
                  <p className="text-xs font-black text-slate-800">
                    {evidence.title ||
                      evidence.caption ||
                      evidence.fileName ||
                      "شاهد"}
                  </p>

                  {evidence.description ? (
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      {evidence.description}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
    </div>
  );
}

function buildRuntimeReportDataForTextLibrary(
  template: ReportTemplateBuilderModel,
  previewCaseData: RuntimePreviewCaseData | null,
): RuntimeReportData {
  const values = getRuntimeValues(previewCaseData);
  const valueMap: Record<string, string> = {};

  values.forEach((item) => {
    const value = item.value || "";

    if (item.fieldKey) {
      valueMap[item.fieldKey] = value;
    }

    if (item.fieldLabel) {
      valueMap[item.fieldLabel] = value;
    }
  });

  const student = getStudent(previewCaseData);
  const evidences = getRuntimeEvidences(previewCaseData);

  return {
    reportTitle: template.name || "عنوان التقارير",
    createdAt: new Date().toISOString(),
    values: {
      ...valueMap,
      programTitle:
        valueMap.program_name ||
        valueMap["عنوان البرنامج"] ||
        valueMap.programTitle ||
        getCaseTitle(previewCaseData) ||
        "برنامج إرشادي",
      executionDate:
        valueMap.gregorian_date ||
        valueMap.executionDate ||
        valueMap["تاريخ التنفيذ"] ||
        "2026-05-26",
      dayText: valueMap.day || valueMap["اليوم"] || "الأحد",
      targetGroup:
        valueMap.beneficiaries ||
        valueMap.targetGroup ||
        valueMap["الفئة المستهدفة"] ||
        student.grade ||
        "الفئة المستهدفة",
      executionAction:
        valueMap.execution_action ||
        valueMap.executionAction ||
        valueMap["الإجراء التنفيذي"] ||
        "إجراء تنفيذي موثق",
      executionMechanism:
        valueMap.execution_mechanism ||
        valueMap.executionMechanism ||
        valueMap["آلية التنفيذ"] ||
        "آلية تنفيذ موثقة",
      performanceIndicator:
        valueMap.performance_indicator ||
        valueMap.performanceIndicator ||
        valueMap["مؤشر الأداء"] ||
        "مؤشر أداء",
      evidenceSuggestion:
        valueMap.evidence_suggestion ||
        valueMap.evidenceSuggestion ||
        valueMap["الشواهد"] ||
        "الشواهد والمرفقات",
      evidenceCountText: formatEvidenceCount(evidences.length),
    },
    evidences: evidences.map((evidence) => ({
      id: evidence.id || undefined,
      title: evidence.title || evidence.caption || evidence.fileName || undefined,
      caption: evidence.caption || undefined,
      description: evidence.description || undefined,
      fileUrl: evidence.fileUrl || evidence.imageUrl || undefined,
      url: evidence.imageUrl || evidence.fileUrl || undefined,
      mimeType: evidence.mimeType || undefined,
    })),
    student: {
      name: student.fullName || "اسم الطالب/الطالبة",
      nationalId: student.nationalId || "",
      grade: student.grade || "",
      classroom: student.classroom || "",
      gender: "",
      guardianName: student.guardianName || "",
      guardianPhone: student.guardianPhone || "",
    },
    service: {
      name: getServiceName(template, previewCaseData),
      slug: template.serviceSlug || "",
    },
    caseEntry: {
      title: getCaseTitle(previewCaseData),
      student: {
        name: student.fullName || "اسم الطالب/الطالبة",
        nationalId: student.nationalId || "",
        grade: student.grade || "",
        classroom: student.classroom || "",
        gender: "",
        guardianName: student.guardianName || "",
        guardianPhone: student.guardianPhone || "",
      },
      service: {
        name: getServiceName(template, previewCaseData),
        slug: template.serviceSlug || "",
      },
    },
    school: {
      name: "اسم المدرسة",
      schoolYear: "1447هـ",
      semester: "الفصل الدراسي",
      principalName: "قائد/قائدة المدرسة",
    },
    counselor: {
      name: "الموجه/الموجهة الطلابية",
    },
  };
}

function getRuntimeValues(
  previewCaseData: RuntimePreviewCaseData | null,
): RuntimeValueItem[] {
  const data = previewCaseData as
    | {
        values?: RuntimeValueItem[];
      }
    | null;

  return Array.isArray(data?.values) ? data.values : [];
}

function getRuntimeEvidences(
  previewCaseData: RuntimePreviewCaseData | null,
): RuntimeEvidenceItem[] {
  const data = previewCaseData as
    | {
        evidences?: RuntimeEvidenceItem[];
      }
    | null;

  return Array.isArray(data?.evidences) ? data.evidences : [];
}

function getStudent(previewCaseData: RuntimePreviewCaseData | null) {
  const data = previewCaseData as
    | {
        student?: {
          fullName?: string | null;
          nationalId?: string | null;
          stage?: string | null;
          grade?: string | null;
          classroom?: string | null;
          guardianName?: string | null;
          guardianPhone?: string | null;
        } | null;
      }
    | null;

  return {
    fullName: data?.student?.fullName || "",
    nationalId: data?.student?.nationalId || "",
    stage: data?.student?.stage || "",
    grade: data?.student?.grade || "",
    classroom: data?.student?.classroom || "",
    guardianName: data?.student?.guardianName || "",
    guardianPhone: data?.student?.guardianPhone || "",
  };
}

function getCaseTitle(previewCaseData: RuntimePreviewCaseData | null) {
  const data = previewCaseData as
    | {
        title?: string | null;
      }
    | null;

  return data?.title || "حالة تجريبية";
}

function getServiceName(
  template: ReportTemplateBuilderModel,
  previewCaseData: RuntimePreviewCaseData | null,
) {
  const data = previewCaseData as
    | {
        serviceName?: string | null;
      }
    | null;

  if (data?.serviceName) {
    return data.serviceName;
  }

  if (template.scope === "SERVICE" && template.serviceSlug) {
    return template.serviceSlug;
  }

  return "الخدمة الإرشادية";
}

function shouldShowTitle(block: ReportTemplateBlock) {
  return block.settings?.showTitle !== false;
}

function isImageEvidence(evidence: RuntimeEvidenceItem) {
  if (evidence.mimeType?.startsWith("image/")) {
    return true;
  }

  const fileName = evidence.fileName || evidence.fileUrl || evidence.imageUrl || "";

  return /\.(png|jpg|jpeg|webp|gif)$/i.test(fileName);
}

function formatEvidenceCount(count: number) {
  if (count <= 0) return "0 شاهد";
  if (count === 1) return "شاهد واحد";
  if (count === 2) return "شاهدان";
  if (count >= 3 && count <= 10) return `${count} شواهد`;
  return `${count} شاهد`;
}

function getPageKindLabel(kind: string) {
  if (kind === "cover") return "غلاف";
  if (kind === "summary") return "ملخص";
  if (kind === "narrative") return "محتوى";
  if (kind === "results") return "نتائج";
  if (kind === "evidence") return "شواهد";
  if (kind === "approval") return "اعتماد";
  return kind;
}





