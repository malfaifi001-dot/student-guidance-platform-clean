"use client";

import type {
  ReportTemplateBlock,
  ReportTemplateBuilderModel,
  ReportTemplatePage,
} from "@/lib/report-engine/report-template-builder-types";
import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";
import {
  sampleOfficialReportData,
  sampleReportIdentity,
} from "@/lib/report-engine/sample-report-data";

type ReportTemplateLivePreviewProps = {
  template: ReportTemplateBuilderModel;
  previewCaseData?: RuntimePreviewCaseData | null;
};

export function ReportTemplateLivePreview({
  template,
  previewCaseData,
}: ReportTemplateLivePreviewProps) {
  const missingRequirements = getTemplateMissingRequirements(template);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            معاينة القالب
          </h2>

          <p className="mt-1 text-sm leading-7 text-slate-500">
            المعاينة تقرأ صفحات وبلوكات القالب مباشرة. إذا أدخلت Case ID صحيح
            ستستخدم بيانات الحالة الحقيقية، وإذا لم توجد بيانات ستعود للبيانات
            التجريبية.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
          {previewCaseData ? "معاينة حقيقية" : "معاينة تجريبية"}
        </div>
      </div>

      {missingRequirements.length ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-black text-amber-900">
            تقرير نقص البيانات/البنية
          </h3>

          <ul className="mt-2 space-y-1 text-xs leading-6 text-amber-800">
            {missingRequirements.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          القالب مكتمل من ناحية البنية الأساسية.
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-900">
            بنية القالب
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            عدد الصفحات والبلوكات الحالية.
          </p>

          <div className="mt-4 space-y-3">
            {template.pages.map((page, index) => (
              <div
                key={page.id}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-slate-900">
                    {index + 1}. {page.title}
                  </strong>

                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                    {page.kind}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {page.blocks.length} بلوك
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-bold text-slate-500">
              معاينة مصغرة لصفحات A4 حسب البلوكات
            </p>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
              {template.pages.length} صفحات
            </span>
          </div>

          <div className="preview-scale-area">
            <div className="preview-scale-inner" dir="rtl">
              {template.pages.map((page, pageIndex) => (
                <PreviewA4Page
                  key={page.id}
                  page={page}
                  pageIndex={pageIndex}
                  previewCaseData={previewCaseData}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .preview-scale-area {
          height: 650px;
          overflow: auto;
          background:
            linear-gradient(45deg, rgba(15, 81, 50, 0.04), transparent),
            #f8fafc;
          padding: 18px;
        }

        .preview-scale-inner {
          width: max-content;
          transform: scale(0.42);
          transform-origin: top right;
        }

        .preview-a4-page {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          box-sizing: border-box;
          margin-bottom: 28px;
          padding: 16mm 18mm 12mm;
          background: white;
          box-shadow: 0 12px 36px rgba(15, 23, 42, 0.14);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 10mm;
          position: relative;
          font-family: Tajawal, Cairo, Arial, sans-serif;
        }

        .preview-page-body {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: grid;
          align-content: start;
          gap: 14px;
        }

        .preview-page-body.cover-body {
          align-content: center;
          justify-items: center;
          text-align: center;
          gap: 18px;
        }

        .preview-page-body.cover-body.top {
          align-content: start;
          padding-top: 28mm;
        }

        .preview-header {
          border-radius: 24px;
          border: 1px solid #d9e7df;
          background:
            linear-gradient(135deg, rgba(15, 81, 50, 0.08), #fff),
            #fff;
          padding: 16px 20px;
          display: grid;
          grid-template-columns: 96px 1fr 96px;
          align-items: center;
          gap: 14px;
        }

        .preview-header-logo {
          height: 62px;
          border-radius: 18px;
          border: 1px solid #d9e7df;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .preview-header-logo img {
          width: 74px;
          height: 52px;
          object-fit: contain;
        }

        .preview-header-text {
          text-align: center;
          line-height: 1.6;
        }

        .preview-header-text strong {
          display: block;
          color: #0f5132;
          font-size: 17px;
        }

        .preview-header-text span {
          display: block;
          color: #667085;
          font-size: 12px;
        }

        .preview-footer {
          border-top: 3px solid #0f5132;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          color: #667085;
          font-size: 11px;
        }

        .preview-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .preview-section-title span {
          width: 8px;
          height: 28px;
          border-radius: 999px;
          background: #0f5132;
        }

        .preview-section-title h4 {
          margin: 0;
          color: #0f5132;
          font-size: 18px;
        }

        .preview-card {
          border: 1px solid #d9e7df;
          border-radius: 20px;
          background: #fff;
          padding: 16px;
        }

        .preview-card.highlight {
          background: linear-gradient(135deg, #eef8f2, #fff);
        }

        .preview-card.plain {
          border-color: transparent;
          padding: 4px 0;
        }

        .preview-card h3 {
          margin: 0 0 8px;
          color: #0f5132;
          font-size: 18px;
        }

        .preview-card p {
          margin: 0;
          color: #475467;
          line-height: 2;
          font-size: 14px;
        }

        .preview-cover-title {
          max-width: 75%;
          margin: auto;
          text-align: center;
        }

        .preview-cover-title .badge {
          display: inline-flex;
          border-radius: 999px;
          background: #eef8f2;
          border: 1px solid #d9e7df;
          color: #0f5132;
          font-weight: 900;
          padding: 8px 18px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .preview-cover-title h1 {
          margin: 0;
          color: #0f5132;
          font-size: 34px;
          line-height: 1.6;
        }

        .preview-cover-title h2 {
          margin: 12px 0 0;
          color: #18251f;
          font-size: 22px;
          line-height: 1.8;
        }

        .preview-cover-title p {
          margin: 18px auto 0;
          color: #667085;
          line-height: 2;
          font-size: 15px;
        }

        .preview-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .preview-meta-grid.one-column {
          grid-template-columns: 1fr;
        }

        .preview-meta-item {
          border: 1px solid #d9e7df;
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          background: #fff;
        }

        .preview-meta-item span {
          color: #667085;
          font-size: 12px;
        }

        .preview-meta-item strong {
          color: #18251f;
          font-size: 13px;
        }

        .preview-evidence-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .preview-evidence-grid.stacked {
          grid-template-columns: 1fr;
        }

        .preview-evidence-card {
          border: 1px solid #d9e7df;
          border-radius: 20px;
          padding: 10px;
          background: #fff;
        }

        .preview-evidence-frame {
          height: 55mm;
          border-radius: 16px;
          overflow: hidden;
          background: #f8faf9;
        }

        .preview-evidence-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .preview-evidence-frame.contain img {
          object-fit: contain;
        }

        .preview-evidence-caption {
          margin-top: 8px;
          color: #0f5132;
          font-size: 13px;
          font-weight: 900;
        }

        .preview-approval-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 0.8fr;
          gap: 12px;
        }

        .preview-approval-box {
          border: 1px solid #d9e7df;
          border-radius: 18px;
          background: #fff;
          padding: 14px;
          display: grid;
          gap: 8px;
        }

        .preview-approval-box span {
          color: #667085;
          font-size: 12px;
        }

        .preview-approval-box strong {
          color: #18251f;
          font-size: 14px;
        }

        .preview-empty-block {
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          background: #f8fafc;
          padding: 18px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }
      `}</style>
    </section>
  );
}

function PreviewA4Page({
  page,
  pageIndex,
  previewCaseData,
}: {
  page: ReportTemplatePage;
  pageIndex: number;
  previewCaseData?: RuntimePreviewCaseData | null;
}) {
  const hasIdentityHeader = page.blocks.some(
    (block) => block.kind === "identity-header"
  );

  const hasApprovalSignature = page.blocks.some(
    (block) => block.kind === "approval-signature"
  );

  const isCover = page.kind === "cover";

  const coverSettings = page.coverSettings || {
    showHeader: true,
    showFooter: true,
    titlePosition: "center",
    showDescription: true,
    showMetaChips: true,
    visualStyle: "official",
  };

  const showHeader = isCover
    ? coverSettings.showHeader !== false
    : hasIdentityHeader;

  const showFooter = isCover
    ? coverSettings.showFooter !== false
    : !hasApprovalSignature;

  return (
    <section className="preview-a4-page">
      {showHeader && hasIdentityHeader ? <PreviewHeader /> : null}

      <div
        className={
          isCover
            ? `preview-page-body cover-body ${
                coverSettings.titlePosition === "top" ? "top" : ""
              }`
            : "preview-page-body"
        }
      >
        {!isCover ? (
          <div className="preview-section-title">
            <span />
            <h4>
              {pageIndex + 1}. {page.title}
            </h4>
          </div>
        ) : null}

        {page.blocks.length ? (
          page.blocks.map((block) => (
            <PreviewBlock
              key={block.id}
              block={block}
              isCover={isCover}
              coverSettings={coverSettings}
              previewCaseData={previewCaseData}
            />
          ))
        ) : (
          <div className="preview-empty-block">
            هذه الصفحة لا تحتوي على بلوكات بعد.
          </div>
        )}
      </div>

      {showFooter ? <PreviewFooter /> : null}
    </section>
  );
}

function PreviewHeader() {
  return (
    <header className="preview-header">
      <div className="preview-header-logo">
        {sampleReportIdentity.schoolLogoUrl ? (
          <img src={sampleReportIdentity.schoolLogoUrl} alt="شعار المدرسة" />
        ) : null}
      </div>

      <div className="preview-header-text">
        <strong>{sampleReportIdentity.ministryName}</strong>
        <span>{sampleReportIdentity.educationDepartment}</span>
        <span>{sampleReportIdentity.educationOffice}</span>
        <strong>{sampleReportIdentity.schoolName}</strong>
      </div>

      <div className="preview-header-logo">
        {sampleReportIdentity.ministryLogoUrl ? (
          <img src={sampleReportIdentity.ministryLogoUrl} alt="شعار الوزارة" />
        ) : null}
      </div>
    </header>
  );
}

function PreviewFooter() {
  return (
    <footer className="preview-footer">
      <span>{sampleReportIdentity.schoolName}</span>
      <span>
        {sampleReportIdentity.academicYear} - {sampleReportIdentity.semester}
      </span>
      <span>صفحة</span>
    </footer>
  );
}

function getRuntimeValue(
  previewCaseData: RuntimePreviewCaseData | null | undefined,
  fieldKey: string | undefined,
  fallback: string
) {
  if (!previewCaseData || !fieldKey) {
    return fallback;
  }

  const exactValue = previewCaseData.values.find(
    (item) => item.fieldKey === fieldKey
  );

  return exactValue?.value || fallback;
}

function getEvidenceImageSource(evidence: {
  imageUrl?: string;
  fileUrl?: string;
}) {
  return evidence.imageUrl || evidence.fileUrl || "";
}

function PreviewBlock({
  block,
  isCover,
  coverSettings,
  previewCaseData,
}: {
  block: ReportTemplateBlock;
  isCover: boolean;
  coverSettings?: ReportTemplatePage["coverSettings"];
  previewCaseData?: RuntimePreviewCaseData | null;
}) {
  const cardClass =
    block.settings?.style === "highlight"
      ? "preview-card highlight"
      : block.settings?.style === "plain"
        ? "preview-card plain"
        : "preview-card";

  const runtimeTitle =
    previewCaseData?.title || sampleOfficialReportData.title;

  const runtimeServiceName =
    previewCaseData?.serviceName || sampleOfficialReportData.serviceName;

  const runtimeFieldValue = getRuntimeValue(
    previewCaseData,
    block.source.fieldKey,
    sampleOfficialReportData.cover.shortDescription ||
      sampleOfficialReportData.sections[0]?.content ||
      "لا توجد بيانات."
  );

  switch (block.kind) {
    case "identity-header":
      return null;

    case "cover-title":
      if (isCover) {
        return (
          <div className="preview-cover-title">
            <div className="badge">{runtimeServiceName}</div>
            <h1>{runtimeTitle}</h1>
            <h2>{sampleOfficialReportData.subtitle}</h2>

            {coverSettings?.showDescription !== false ? (
              <p>{sampleOfficialReportData.cover.shortDescription}</p>
            ) : null}
          </div>
        );
      }

      return (
        <div className={cardClass}>
          <h3>{runtimeTitle}</h3>
          <p>{runtimeServiceName}</p>
        </div>
      );

    case "case-meta":
      return (
        <div
          className={
            block.settings?.columns === 1
              ? "preview-meta-grid one-column"
              : "preview-meta-grid"
          }
        >
          <PreviewMetaItem label="الخدمة" value={runtimeServiceName} />

          <PreviewMetaItem
            label="تاريخ التقرير"
            value={
              previewCaseData?.createdAt
                ? new Date(previewCaseData.createdAt).toLocaleDateString(
                    "ar-SA"
                  )
                : sampleOfficialReportData.reportDate
            }
          />

          <PreviewMetaItem
            label="عنوان التقرير"
            value={runtimeTitle}
          />

          <PreviewMetaItem
            label="الحالة"
            value={previewCaseData?.status || "تجريبي"}
          />
        </div>
      );

    case "student-summary":
      return (
        <div className={cardClass}>
          <h3>بيانات الطالب/الطالبة</h3>

          {previewCaseData?.student ? (
            <div className="preview-meta-grid">
              <PreviewMetaItem
                label="الاسم"
                value={previewCaseData.student.name || "غير محدد"}
              />
              <PreviewMetaItem
                label="الصف"
                value={previewCaseData.student.grade || "غير محدد"}
              />
              <PreviewMetaItem
                label="الفصل"
                value={previewCaseData.student.classroom || "غير محدد"}
              />
              <PreviewMetaItem
                label="ولي الأمر"
                value={previewCaseData.student.guardianName || "غير محدد"}
              />
            </div>
          ) : (
            <p>
              يظهر هذا البلوك عند وجود طالب/طالبة مرتبط بالحالة من بيانات نور.
            </p>
          )}
        </div>
      );

    case "service-summary":
      return (
        <div className={cardClass}>
          <h3>ملخص الخدمة</h3>
          <p>
            {runtimeServiceName} — {runtimeTitle}
          </p>
        </div>
      );

    case "paragraph":
      return (
        <div className={cardClass}>
          {block.settings?.showTitle !== false ? <h3>{block.title}</h3> : null}
          <p>{runtimeFieldValue}</p>
        </div>
      );

    case "custom-paragraph":
      return (
        <div className={cardClass}>
          {block.settings?.showTitle !== false ? (
            <h3>{block.customTitle || block.title || "فقرة مخصصة"}</h3>
          ) : null}

          <p>
            {block.customContent ||
              "هذا نص مخصص داخل القالب، غير مرتبط ببيانات الحالة."}
          </p>
        </div>
      );

    case "field-list": {
      const fallbackItems = [
        { label: "الهدف الأول", value: "تعزيز السلوك الإيجابي" },
        { label: "الإجراء", value: "نشرات ومواد توعوية" },
        { label: "النتيجة", value: "رفع الوعي والانضباط" },
        { label: "الحالة", value: "مكتمل" },
      ];

      const runtimeItems = previewCaseData?.values?.length
        ? previewCaseData.values.slice(0, 4).map((item) => ({
            label: item.fieldLabel,
            value: item.value || "غير محدد",
          }))
        : fallbackItems;

      return (
        <div className={cardClass}>
          <h3>{block.title}</h3>

          <div
            className={
              block.settings?.columns === 1
                ? "preview-meta-grid one-column"
                : "preview-meta-grid"
            }
          >
            {runtimeItems.map((item) => (
              <PreviewMetaItem
                key={`${item.label}-${item.value}`}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </div>
      );
    }

    case "text-library":
      return (
        <div className={cardClass}>
          <h3>نص جاهز من المكتبة</h3>
          <p>
            تم تنفيذ البرنامج وفق خطة إرشادية تهدف إلى تعزيز القيم التربوية
            والسلوكية داخل البيئة المدرسية.
          </p>
        </div>
      );

    case "evidence-gallery": {
      const layout = block.settings?.evidenceLayout || "grid-2x2";
      const imageFit = block.settings?.imageFit || "cover";
      const showCaptions = block.settings?.showCaptions !== false;

      const runtimeEvidences = previewCaseData?.evidences?.length
        ? previewCaseData.evidences
        : sampleOfficialReportData.evidences;

      return (
        <div
          className={
            layout === "stacked" || layout === "one-per-page"
              ? "preview-evidence-grid stacked"
              : "preview-evidence-grid"
          }
        >
          {runtimeEvidences.slice(0, 4).map((evidence) => (
            <div key={evidence.id} className="preview-evidence-card">
              <div
                className={
                  imageFit === "contain"
                    ? "preview-evidence-frame contain"
                    : "preview-evidence-frame"
                }
              >{getEvidenceImageSource(evidence) ? (
  <img
    src={getEvidenceImageSource(evidence)}
    alt={evidence.title || "شاهد"}
  />
) : null}
              </div>

              {showCaptions ? (
                <div className="preview-evidence-caption">
                  {evidence.title || "شاهد"}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      );
    }

    case "approval-signature":
      return (
        <div className={cardClass}>
          <h3>الاعتماد والتوقيع</h3>

          <div className="preview-approval-grid">
            <div className="preview-approval-box">
              <span>الموجه/الموجهة</span>
              <strong>{sampleReportIdentity.counselorName}</strong>
              <span>التوقيع: ....................</span>
            </div>

            <div className="preview-approval-box">
              <span>قائد/قائدة المدرسة</span>
              <strong>قائد المدرسة</strong>
              <span>الختم: ....................</span>
            </div>

            <div className="preview-approval-box">
              <span>التاريخ</span>
              <strong>
                {previewCaseData?.createdAt
                  ? new Date(previewCaseData.createdAt).toLocaleDateString(
                      "ar-SA"
                    )
                  : sampleOfficialReportData.reportDate}
              </strong>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="preview-empty-block">
          بلوك غير معروف: {block.title}
        </div>
      );
  }
}

function PreviewMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="preview-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getTemplateMissingRequirements(template: ReportTemplateBuilderModel) {
  const messages: string[] = [];

  if (!template.pages.length) {
    messages.push("القالب لا يحتوي على صفحات.");
  }

  const hasEvidence = template.pages.some((page) =>
    page.blocks.some((block) => block.kind === "evidence-gallery")
  );

  const hasCover = template.pages.some((page) => page.kind === "cover");

  if (!hasCover) {
    messages.push("لا توجد صفحة غلاف. هذا اختياري لكنه مفيد للتقارير الرسمية.");
  }

  if (!hasEvidence) {
    messages.push(
      "لا يوجد بلوك للشواهد. قد لا يناسب القالب التقارير التي تحتاج إثباتات."
    );
  }

  return messages;
}