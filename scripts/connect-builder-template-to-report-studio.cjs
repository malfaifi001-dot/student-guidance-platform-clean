const fs = require("fs");

const path = "app/dashboard/reports/[reportId]/studio/page.tsx";
let content = fs.readFileSync(path, "utf8");

// 1) Import Builder live preview
if (!content.includes('report-template-live-preview')) {
  content = content.replace(
`import { ReportStudioEditor } from "@/components/reports/report-studio-editor";`,
`import { ReportStudioEditor } from "@/components/reports/report-studio-editor";
import { ReportTemplateLivePreview } from "@/components/report-engine/report-template-live-preview";`
  );
}

// 2) Add helper functions after types
if (!content.includes("function getBuilderTemplateFromSnapshot")) {
  content = content.replace(
`type ReportFieldLookupItem = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: Array<{
    label?: string | null;
    value?: string | null;
  }> | null;
};`,
`type ReportFieldLookupItem = {
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
}`
  );
}

// 3) Insert Builder branch before normalizedReport
if (!content.includes("const builderTemplate = getBuilderTemplateFromSnapshot(report.templateSnapshot);")) {
  content = content.replace(
`  const liveCaseValues = buildStudioReportValues(
    normalizedCaseValues,
    workflowValueOverrides
  );

  const normalizedReport = {`,
`  const liveCaseValues = buildStudioReportValues(
    normalizedCaseValues,
    workflowValueOverrides
  );

  const builderTemplate = getBuilderTemplateFromSnapshot(report.templateSnapshot);

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
              هذا التقرير مبني من قالب منشور محفوظ كـ Snapshot، لذلك لا نعرض
              القوالب الثلاثة القديمة هنا.
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

  const normalizedReport = {`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط صفحة Studio بقالب Builder Snapshot وإيقاف القوالب القديمة للتقارير الجديدة.");
