import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportDocumentRenderer } from "@/components/report-engine/report-document-renderer";
import { ReportPrintButton } from "@/components/report-engine/report-print-button";
import { buildOfficialReportDataFromCase } from "@/lib/report-engine/report-data-mapper";
import type {
  EvidenceLayout,
  ReportTemplateId,
} from "@/lib/report-engine/report-types";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<{
    template?: string;
    evidenceLayout?: string;
    cover?: string;
  }>;
};

const allowedTemplates: ReportTemplateId[] = [
  "official-long",
  "visual-activity",
  "executive-brief",
];

const allowedEvidenceLayouts: EvidenceLayout[] = [
  "auto",
  "single-large",
  "two-columns",
  "stacked",
  "grid-2x2",
  "one-per-page",
];

export default async function ReportRealPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const templateId = normalizeTemplateId(resolvedSearchParams.template);
  const evidenceLayout = normalizeEvidenceLayout(
    resolvedSearchParams.evidenceLayout
  );
  const showCover = resolvedSearchParams.cover !== "false";

  const caseEntry = await prisma.caseEntry.findUnique({
    where: {
      id: reportId,
    },
    include: {
      service: true,
      student: true,
      values: {
        include: {
          field: true,
        },
      },
      evidences: true,
    },
  });

  if (!caseEntry) {
    notFound();
  }

  const { identity, report } = buildOfficialReportDataFromCase({
    caseEntry,
    evidenceLayout,
    identity: {
      schoolName: "مدرسة الملك عبدالعزيز الثانوية",
      educationDepartment: "الإدارة العامة للتعليم بمنطقة جازان",
      educationOffice: "مكتب التعليم بفيفاء",
      counselorName: "محمد الفيفي",
      counselorTitle: "الموجه الطلابي",
      academicYear: "1447هـ",
      semester: "الفصل الدراسي الأول",
      ministryLogoUrl: "/sample/report-evidence/ministry-logo.png",
      schoolLogoUrl: "/sample/report-evidence/square-evidence-1.png",
    },
  });

  return (
    <div className="real-report-preview" dir="rtl">
      <aside className="report-actions">
        <div>
          <h1>معاينة التقرير</h1>
          <p>
            هذه معاينة التقرير الفعلية من بيانات الحالة/الخدمة، وليست بيانات
            تجريبية.
          </p>
        </div>

        <section className="action-section">
          <h2>قالب التقرير</h2>

          <div className="action-group">
            <Link
              href={buildPreviewUrl(
                reportId,
                "official-long",
                evidenceLayout,
                showCover
              )}
              className={templateId === "official-long" ? "active" : ""}
            >
              القالب الرسمي
            </Link>

            <Link
              href={buildPreviewUrl(
                reportId,
                "visual-activity",
                evidenceLayout,
                showCover
              )}
              className={templateId === "visual-activity" ? "active" : ""}
            >
              القالب البصري
            </Link>

            <Link
              href={buildPreviewUrl(
                reportId,
                "executive-brief",
                evidenceLayout,
                showCover
              )}
              className={templateId === "executive-brief" ? "active" : ""}
            >
              القالب المختصر
            </Link>
          </div>
        </section>

        <section className="action-section">
          <h2>تخطيط الشواهد</h2>

          <div className="action-group">
            <Link
              href={buildPreviewUrl(
                reportId,
                templateId,
                "grid-2x2",
                showCover
              )}
              className={evidenceLayout === "grid-2x2" ? "active" : ""}
            >
              شواهد 2×2
            </Link>

            <Link
              href={buildPreviewUrl(
                reportId,
                templateId,
                "two-columns",
                showCover
              )}
              className={evidenceLayout === "two-columns" ? "active" : ""}
            >
              صورتان بجانب بعض
            </Link>

            <Link
              href={buildPreviewUrl(
                reportId,
                templateId,
                "stacked",
                showCover
              )}
              className={evidenceLayout === "stacked" ? "active" : ""}
            >
              صور تحت بعض
            </Link>

            <Link
              href={buildPreviewUrl(
                reportId,
                templateId,
                "one-per-page",
                showCover
              )}
              className={evidenceLayout === "one-per-page" ? "active" : ""}
            >
              شاهد لكل صفحة
            </Link>
          </div>
        </section>

        <section className="action-section">
          <h2>خيارات التقرير</h2>

          <div className="action-group">
            <Link
              href={buildPreviewUrl(
                reportId,
                templateId,
                evidenceLayout,
                !showCover
              )}
            >
              {showCover ? "إخفاء الغلاف" : "إظهار الغلاف"}
            </Link>
          </div>
        </section>

        <ReportPrintButton />
      </aside>

      <main className="report-canvas">
        <ReportDocumentRenderer
          identity={identity}
          report={report}
          templateId={templateId}
          showCover={showCover}
          evidenceLayout={evidenceLayout}
        />
      </main>

      <style>{`
        .real-report-preview {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 320px 1fr;
          background: #eef1ef;
          font-family: Tajawal, Cairo, Arial, sans-serif;
        }

        .report-actions {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: auto;
          background: #fff;
          border-left: 1px solid #e5e7eb;
          padding: 24px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .report-actions h1 {
          margin: 0;
          color: #0f5132;
          font-size: 24px;
        }

        .report-actions p {
          margin: 8px 0 0;
          color: #667085;
          line-height: 1.8;
          font-size: 13px;
        }

        .action-section {
          display: grid;
          gap: 10px;
        }

        .action-section h2 {
          margin: 0;
          font-size: 13px;
          color: #344054;
          font-weight: 900;
        }

        .action-group {
          display: grid;
          gap: 8px;
        }

        .action-group a {
          text-decoration: none;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 11px 12px;
          color: #344054;
          font-weight: 800;
          font-size: 13px;
          background: #fff;
        }

        .action-group a.active {
          background: #eef8f2;
          border-color: #0f5132;
          color: #0f5132;
        }

        .report-print-button {
          border: 0;
          border-radius: 14px;
          padding: 12px 14px;
          background: #0f5132;
          color: white;
          font-family: inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .report-canvas {
          overflow: auto;
        }

        @media print {
          .real-report-preview {
            display: block;
            background: white;
          }

          .report-actions {
            display: none;
          }

          .report-canvas {
            overflow: visible;
          }
        }
      `}</style>
    </div>
  );
}

function normalizeTemplateId(value?: string): ReportTemplateId {
  if (allowedTemplates.includes(value as ReportTemplateId)) {
    return value as ReportTemplateId;
  }

  return "official-long";
}

function normalizeEvidenceLayout(value?: string): EvidenceLayout {
  if (allowedEvidenceLayouts.includes(value as EvidenceLayout)) {
    return value as EvidenceLayout;
  }

  return "grid-2x2";
}

function buildPreviewUrl(
  reportId: string,
  templateId: ReportTemplateId,
  evidenceLayout: EvidenceLayout,
  showCover: boolean
) {
  const params = new URLSearchParams();

  params.set("template", templateId);
  params.set("evidenceLayout", evidenceLayout);
  params.set("cover", String(showCover));

  return `/dashboard/reports/${reportId}/preview?${params.toString()}`;
}