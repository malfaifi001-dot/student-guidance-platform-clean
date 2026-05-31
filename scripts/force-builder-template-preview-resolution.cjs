const fs = require("fs");

const path = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("async function getBuilderTemplateFromDatabase")) {
  content = content.replace(
`function getBuilderTemplateFromSnapshot(snapshot: unknown) {
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
}`,
`function getBuilderTemplateFromSnapshot(snapshot: unknown) {
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

  if (allowedTemplates.includes(templateId as ReportTemplateId)) {
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
}`
  );
}

content = content.replace(
`  const builderTemplate = getBuilderTemplateFromSnapshot(report.templateSnapshot);
  const builderPreviewCaseData = builderTemplate
    ? buildBuilderPreviewCaseData(report, reportValues)
    : null;`,
`  const builderTemplate =
    getBuilderTemplateFromSnapshot(report.templateSnapshot) ||
    (await getBuilderTemplateFromDatabase(
      resolvedSearchParams.template || report.templateId
    ));

  const builderPreviewCaseData = builderTemplate
    ? buildBuilderPreviewCaseData(report, reportValues)
    : null;`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم تقوية معاينة التقارير لتقرأ قالب Builder من Snapshot أو من قاعدة البيانات.");
