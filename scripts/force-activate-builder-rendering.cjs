const fs = require("fs");

function mustReplace(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`لم أجد مكان الاستبدال المطلوب: ${label}`);
  }

  return content.replace(search, replacement);
}

/* =========================================================
   1) Fix preview/page.tsx
========================================================= */

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

const previewOfficialReportBlock = `  const officialReport = buildOfficialReportData({
    report,
    reportValues,
    parsedEditableContent,
    evidenceLayout: selectedEvidenceLayout,
    viewMode: selectedViewMode,
  });

  return (`;

const previewOfficialReportReplacement = `  const officialReport = buildOfficialReportData({
    report,
    reportValues,
    parsedEditableContent,
    evidenceLayout: selectedEvidenceLayout,
    viewMode: selectedViewMode,
  });

  const builderTemplate =
    getBuilderTemplateFromSnapshot(report.templateSnapshot) ||
    (await getBuilderTemplateFromDatabase(
      resolvedSearchParams.template || report.templateId
    ));

  const builderPreviewCaseData = builderTemplate
    ? buildBuilderPreviewCaseData(report, reportValues)
    : null;

  return (`;

if (!preview.includes("const builderTemplate =")) {
  preview = mustReplace(
    preview,
    previewOfficialReportBlock,
    previewOfficialReportReplacement,
    "preview: insert builderTemplate before return"
  );
}

const previewOldRenderBlock = `      <section className={studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>
        <ReportDocumentRenderer
          identity={identity}
          report={officialReport}
          templateId={selectedTemplate}
          showCover={showCover}
          evidenceLayout={selectedEvidenceLayout}
        />
      </section>`;

const previewNewRenderBlock = `      <section className={studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>
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
      </section>`;

if (preview.includes(previewOldRenderBlock)) {
  preview = mustReplace(
    preview,
    previewOldRenderBlock,
    previewNewRenderBlock,
    "preview: replace ReportDocumentRenderer with builder conditional"
  );
}

fs.writeFileSync(previewPath, preview, "utf8");

/* =========================================================
   2) Fix studio/page.tsx
========================================================= */

const studioPath = "app/dashboard/reports/[reportId]/studio/page.tsx";
let studio = fs.readFileSync(studioPath, "utf8");

const studioTypesBlock = `type ReportFieldLookupItem = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: Array<{
    label?: string | null;
    value?: string | null;
  }> | null;
};

export default async function ReportStudioPage({ params }: PageProps) {`;

const studioTypesReplacement = `type ReportFieldLookupItem = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: Array<{
    label?: string | null;
    value?: string | null;
  }> | null;
};

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

function parseBuilderTemplateJson(value: unknown) {
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

async function getBuilderTemplateFromDatabase(templateId?: string | null) {
  if (!templateId) {
    return null;
  }

  if (
    templateId === "official-long" ||
    templateId === "visual-activity" ||
    templateId === "executive-brief"
  ) {
    return null;
  }

  const templateRecord = await prisma.reportTemplate.findUnique({
    where: {
      id: templateId,
    },
  });

  if (!templateRecord) {
    return null;
  }

  const templateJson =
    parseBuilderTemplateJson(templateRecord.templateJson) ||
    parseBuilderTemplateJson(templateRecord.content);

  if (!templateJson || !Array.isArray(templateJson.pages)) {
    return null;
  }

  return {
    ...templateJson,
    id: templateRecord.id,
    name: templateRecord.name || templateJson.name,
    description:
      templateRecord.description ||
      templateJson.description ||
      "قالب تقرير محفوظ من صانع القوالب.",
    serviceSlug: templateRecord.serviceSlug || templateJson.serviceSlug || null,
    status: "PUBLISHED",
  };
}

function buildBuilderStudioPreviewCaseData(
  report: any,
  values: StudioReportValue[]
) {
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

    values: values.map((item) => ({
      fieldKey: item.fieldKey,
      fieldLabel: item.fieldLabel,
      value: item.value,
    })),

    evidences: report.evidenceItems
      .filter((item: any) => item.visible !== false)
      .map((item: any) => ({
        id: item.id,
        title: item.caption || item.fileName,
        fileName: item.fileName,
        fileUrl: item.fileUrl || "",
        imageUrl: item.mimeType?.startsWith("image/") ? item.fileUrl : undefined,
        note: item.caption || "",
      })),
  };
}

export default async function ReportStudioPage({ params }: PageProps) {`;

if (!studio.includes("function getBuilderTemplateFromSnapshot")) {
  studio = mustReplace(
    studio,
    studioTypesBlock,
    studioTypesReplacement,
    "studio: add builder helper functions"
  );
}

const studioLiveCaseBlock = `  const liveCaseValues = buildStudioReportValues(
    normalizedCaseValues,
    workflowValueOverrides
  );

  const normalizedReport = {`;

const studioLiveCaseReplacement = `  const liveCaseValues = buildStudioReportValues(
    normalizedCaseValues,
    workflowValueOverrides
  );

  const builderTemplate =
    getBuilderTemplateFromSnapshot(report.templateSnapshot) ||
    (await getBuilderTemplateFromDatabase(report.templateId));

  if (builderTemplate) {
    const builderPreviewCaseData = buildBuilderStudioPreviewCaseData(
      report,
      liveCaseValues
    );

    return (
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[2rem] bg-gradient-to-br from-emerald-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl">
          <div>
            <p className="text-sm font-bold text-emerald-100">
              Report Builder Snapshot
            </p>

            <h1 className="mt-3 text-4xl font-black">
              معاينة التقرير بقالب Builder
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50">
              هذا التقرير يستخدم القالب المنشور المحفوظ من صانع القوالب، وليس القوالب الثلاثة القديمة.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
          <ReportTemplateLivePreview
            template={builderTemplate}
            snippets={[]}
            previewCaseData={builderPreviewCaseData as any}
          />
        </section>
      </main>
    );
  }

  const normalizedReport = {`;

if (!studio.includes("const builderTemplate =")) {
  studio = mustReplace(
    studio,
    studioLiveCaseBlock,
    studioLiveCaseReplacement,
    "studio: insert builder conditional before normalizedReport"
  );
}

fs.writeFileSync(studioPath, studio, "utf8");

console.log("تم تعديل preview و studio بنجاح.");
