const fs = require("fs");

const path = "app/api/dashboard/reports/route.ts";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("async function createTemplateSnapshotFromDatabase")) {
  content = content.replace(
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

function isBuilderTemplateJson(value: Record<string, any> | null) {
  return Boolean(value && Array.isArray(value.pages));
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

  if (!builderTemplate || !isBuilderTemplateJson(templateJson)) {
    return createDefaultTemplateSnapshot(templateId);
  }

  const safeTemplateJson = templateJson as Record<string, any>;

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
      ...safeTemplateJson,
      id: builderTemplate.id,
      name: builderTemplate.name || safeTemplateJson.name,
      description:
        builderTemplate.description ||
        safeTemplateJson.description ||
        "قالب تقرير محفوظ من صانع القوالب.",
      serviceSlug:
        builderTemplate.serviceSlug || safeTemplateJson.serviceSlug || null,
      status: safeTemplateJson.status || "PUBLISHED",
    },
  };
}

function buildReportContent(reportData: ReportMappedCase) {`
  );
}

content = content.replace(
  /const templateSnapshot = createDefaultTemplateSnapshot\(templateId\);/g,
  "const templateSnapshot = await createTemplateSnapshotFromDatabase(templateId);"
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح API إنشاء التقرير لحفظ Builder Snapshot.");
