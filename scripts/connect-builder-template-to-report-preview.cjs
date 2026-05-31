const fs = require("fs");

/* =========================================================
   1) Update create report API to snapshot real Builder template
========================================================= */

const apiPath = "app/api/dashboard/reports/route.ts";
let api = fs.readFileSync(apiPath, "utf8");

if (!api.includes("function parseBuilderTemplateJson")) {
  api = api.replace(
`function buildReportContent(reportData: ReportMappedCase) {`,
`function parseBuilderTemplateJson(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    return value as Record<string, any>;
  }

  return null;
}

function isPublishedBuilderTemplate(templateJson: Record<string, any> | null) {
  return templateJson?.status === "PUBLISHED" && Array.isArray(templateJson?.pages);
}

async function createTemplateSnapshotFromDatabase(templateId: string) {
  const builderTemplate = await prisma.reportTemplate.findUnique({
    where: {
      id: templateId,
    },
  });

  const templateJson =
    parseBuilderTemplateJson(builderTemplate?.templateJson) ||
    parseBuilderTemplateJson(builderTemplate?.content);

  if (!builderTemplate || !isPublishedBuilderTemplate(templateJson)) {
    return createDefaultTemplateSnapshot(templateId);
  }

  return {
    templateId: builderTemplate.id,
    templateName: builderTemplate.name,
    version: 1,
    capturedAt: new Date().toISOString(),
    source: "TEMPLATE_BUILDER",
    settings: {
      showCover: true,
      defaultTemplate: builderTemplate.id,
      defaultEvidenceLayout: "grid-2x2",
      pageSize: "A4",
      direction: "rtl",
    },
    builderTemplate: {
      ...templateJson,
      id: builderTemplate.id,
      name: builderTemplate.name || templateJson.name,
      description:
        builderTemplate.description ||
        templateJson.description ||
        "قالب تقرير محفوظ من صانع القوالب.",
      serviceSlug: builderTemplate.serviceSlug || templateJson.serviceSlug,
      status: "PUBLISHED",
    },
  };
}

function buildReportContent(reportData: ReportMappedCase) {`
  );
}

api = api.replace(
`    const templateSnapshot = createDefaultTemplateSnapshot(templateId);
    const reportDataSnapshot = createReportDataSnapshot(reportData);`,
`    const templateSnapshot = await createTemplateSnapshotFromDatabase(templateId);
    const reportDataSnapshot = createReportDataSnapshot(reportData);`
);

fs.writeFileSync(apiPath, api, "utf8");


/* =========================================================
   2) Update preview page to render Builder template snapshot
========================================================= */

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

if (!preview.includes('ReportTemplateLivePreview')) {
  preview = preview.replace(
`import { ReportDocumentRenderer } from "@/components/report-engine/report-document-renderer";`,
`import { ReportDocumentRenderer } from "@/components/report-engine/report-document-renderer";
import { ReportTemplateLivePreview } from "@/components/report-engine/report-template-live-preview";`
  );
}

if (!preview.includes("function getBuilderTemplateFromSnapshot")) {
  preview = preview.replace(
`const allowedReportViewModes: ReportViewMode[] = ["text", "grid", "mixed"];`,
`const allowedReportViewModes: ReportViewMode[] = ["text", "grid", "mixed"];

function getBuilderTemplateFromSnapshot(snapshot: unknown) {
  const data = snapshot as
    | {
        source?: string;
        builderTemplate?: any;
      }
    | null
    | undefined;

  if (data?.source !== "TEMPLATE_BUILDER") {
    return null;
  }

  if (!data.builderTemplate || !Array.isArray(data.builderTemplate.pages)) {
    return null;
  }

  return data.builderTemplate;
}

function buildBuilderPreviewCaseData(report: any, reportValues: ReportValueItem[]) {
  const student = report.caseEntry.student;
  const guardian = student?.guardian;

  return {
    id: report.caseEntry.id,
    title: report.caseEntry.title || report.title,
    status: report.caseEntry.status,
    createdAt: report.caseEntry.createdAt?.toISOString?.() || "",
    updatedAt: report.caseEntry.updatedAt?.toISOString?.() || "",
    submittedAt: report.caseEntry.submittedAt?.toISOString?.() || null,
    serviceName: report.caseEntry.service.name,
    serviceSlug: report.caseEntry.service.slug,

    service: {
      id: report.caseEntry.service.id,
      name: report.caseEntry.service.name,
      slug: report.caseEntry.service.slug,
    },

    student: student
      ? {
          id: student.id,
          fullName: student.fullName,
          nationalId: student.nationalId,
          stage: student.stage,
          grade: student.grade,
          classroom: student.classroom,
          guardianName: guardian?.name || null,
          guardianPhone: guardian?.phone || null,
        }
      : null,

    values: reportValues.map((item) => ({
      fieldKey: item.fieldKey,
      fieldLabel: item.fieldLabel,
      value: item.displayValue,
    })),

    evidences: buildReportEvidences(report).map((item) => ({
      id: item.id,
      title: item.title,
      fileName: item.fileName || item.title,
      fileUrl: item.fileUrl || "",
      imageUrl: item.imageUrl,
      note: item.description || "",
    })),
  };
}`
  );
}

if (!preview.includes("const builderTemplate = getBuilderTemplateFromSnapshot")) {
  preview = preview.replace(
`  const officialReport = buildOfficialReportData({
    report,
    reportValues,
    parsedEditableContent,
    evidenceLayout: selectedEvidenceLayout,
    viewMode: selectedViewMode,
  });`,
`  const officialReport = buildOfficialReportData({
    report,
    reportValues,
    parsedEditableContent,
    evidenceLayout: selectedEvidenceLayout,
    viewMode: selectedViewMode,
  });

  const builderTemplate = getBuilderTemplateFromSnapshot(report.templateSnapshot);
  const builderPreviewCaseData = builderTemplate
    ? buildBuilderPreviewCaseData(report, reportValues)
    : null;`
  );
}

preview = preview.replace(
`      <section className={studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>
        <ReportDocumentRenderer
          identity={identity}
          report={officialReport}
          templateId={selectedTemplate}
          showCover={showCover}
          evidenceLayout={selectedEvidenceLayout}
        />
      </section>`,
`      <section className={studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>
        {builderTemplate ? (
          <ReportTemplateLivePreview
            template={builderTemplate}
            snippets={[]}
            previewCaseData={builderPreviewCaseData as any}
          />
        ) : (
          <ReportDocumentRenderer
            identity={identity}
            report={officialReport}
            templateId={selectedTemplate}
            showCover={showCover}
            evidenceLayout={selectedEvidenceLayout}
          />
        )}
      </section>`
);

fs.writeFileSync(previewPath, preview, "utf8");

console.log("تم ربط إنشاء التقرير والمعاينة بقوالب Builder المنشورة.");
