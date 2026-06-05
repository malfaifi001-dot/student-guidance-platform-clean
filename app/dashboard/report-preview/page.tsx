"use client";

import { useMemo, useState } from "react";
import { ReportDocumentRenderer } from "@/components/report-engine/report-document-renderer";
import {
  sampleOfficialReportData,
  sampleReportIdentity,
} from "@/lib/report-engine/sample-report-data";
import {
  getMissingReportFields,
  getReportTemplate,
  reportTemplates,
} from "@/lib/report-engine/report-templates";
import type {
  EvidenceLayout,
  ReportTemplateId,
} from "@/lib/report-engine/report-types";

const evidenceLayouts: {
  id: EvidenceLayout;
  name: string;
}[] = [
  { id: "auto", name: "تلقائي" },
  { id: "grid-2x2", name: "شبكة 2×2" },
  { id: "two-columns", name: "صورتان بجانب بعض" },
  { id: "stacked", name: "صور تحت بعض" },
  { id: "single-large", name: "صورة كبيرة" },
  { id: "one-per-page", name: "كل شاهد في صفحة" },
];

export default function ReportPreviewPage() {
  const [templateId, setTemplateId] =
    useState<ReportTemplateId>("visual-activity");

  const template = getReportTemplate(templateId);

  const [showCover, setShowCover] = useState(template.supportsCoverPage);

  const [evidenceLayout, setEvidenceLayout] =
    useState<EvidenceLayout>(template.defaultEvidenceLayout);

  const missingFields = useMemo(() => {
    return getMissingReportFields(sampleOfficialReportData, templateId);
  }, [templateId]);

  function handleTemplateChange(value: ReportTemplateId) {
    const nextTemplate = getReportTemplate(value);

    setTemplateId(value);
    setShowCover(nextTemplate.supportsCoverPage);
    setEvidenceLayout(nextTemplate.defaultEvidenceLayout);
  }

  return (
    <div className="report-preview-shell" dir="rtl">
      <aside className="report-sidebar">
        <div>
          <h1>تجهيز التقارير</h1>
          <p>
            اختر القالب وتخطيط الشواهد فقط. باقي البيانات يتم سحبها تلقائيًا من الخدمة.
          </p>
        </div>

        <section className="control-section">
          <label>قالب التقارير</label>

          <div className="template-list">
            {reportTemplates.map((templateItem) => (
              <button
                key={templateItem.id}
                type="button"
                className={
                  templateItem.id === templateId
                    ? "template-card active"
                    : "template-card"
                }
                onClick={() => handleTemplateChange(templateItem.id)}
              >
                <strong>{templateItem.name}</strong>
                <span>{templateItem.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="control-section">
          <label>تخطيط الشواهد</label>

          <select
            value={evidenceLayout}
            onChange={(event) =>
              setEvidenceLayout(event.target.value as EvidenceLayout)
            }
          >
            {evidenceLayouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </section>

        {template.supportsCoverPage ? (
          <section className="control-section inline-control">
            <input
              id="show-cover"
              type="checkbox"
              checked={showCover}
              onChange={(event) => setShowCover(event.target.checked)}
            />
            <label htmlFor="show-cover">إظهار صفحة الغلاف</label>
          </section>
        ) : null}

        <section className="control-section">
          <label>المدخلات المطلوبة لهذا القالب</label>

          {missingFields.length ? (
            <div className="missing-box">
              <strong>ينقص التقارير:</strong>
              <ul>
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="ready-box">
              التقارير جاهز. لا توجد بيانات أساسية ناقصة.
            </div>
          )}
        </section>

        <button
          type="button"
          className="print-button"
          onClick={() => window.print()}
        >
          طباعة / حفظ PDF
        </button>
      </aside>

      <main className="preview-area">
        <ReportDocumentRenderer
          identity={sampleReportIdentity}
          report={sampleOfficialReportData}
          templateId={templateId}
          showCover={showCover}
          evidenceLayout={evidenceLayout}
        />
      </main>

      <style>{`
        .report-preview-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 360px 1fr;
          background: #eef1ef;
          font-family: Tajawal, Cairo, Arial, sans-serif;
        }

        .report-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: auto;
          background: #fff;
          border-left: 1px solid #e5e7eb;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          z-index: 30;
        }

        .report-sidebar h1 {
          margin: 0;
          font-size: 24px;
          color: #0f5132;
        }

        .report-sidebar p {
          margin: 8px 0 0;
          color: #667085;
          line-height: 1.8;
          font-size: 14px;
        }

        .control-section {
          display: grid;
          gap: 10px;
        }

        .control-section > label {
          font-size: 13px;
          color: #344054;
          font-weight: 800;
        }

        .template-list {
          display: grid;
          gap: 10px;
        }

        .template-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          padding: 14px;
          text-align: right;
          cursor: pointer;
          display: grid;
          gap: 6px;
          font-family: inherit;
        }

        .template-card strong {
          color: #18251f;
          font-size: 14px;
        }

        .template-card span {
          color: #667085;
          font-size: 12px;
          line-height: 1.6;
        }

        .template-card.active {
          border-color: #0f5132;
          background: #eef8f2;
        }

        select {
          border: 1px solid #d0d5dd;
          border-radius: 14px;
          padding: 11px 12px;
          background: white;
          font-family: inherit;
        }

        .inline-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .inline-control label {
          cursor: pointer;
        }

        .missing-box,
        .ready-box {
          border-radius: 16px;
          padding: 14px;
          line-height: 1.8;
          font-size: 13px;
        }

        .missing-box {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
        }

        .missing-box ul {
          margin: 8px 0 0;
          padding-right: 18px;
        }

        .ready-box {
          background: #ecfdf3;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .print-button {
          border: 0;
          border-radius: 16px;
          background: #0f5132;
          color: white;
          padding: 13px 18px;
          font-weight: 900;
          cursor: pointer;
          font-family: inherit;
        }

        .preview-area {
          overflow: auto;
        }

        @media print {
          .report-preview-shell {
            display: block;
            background: white;
          }

          .report-sidebar {
            display: none;
          }

          .preview-area {
            display: block;
            overflow: visible;
          }
        }
      `}</style>
    </div>
  );
}