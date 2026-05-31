const fs = require("fs");

const path = "app/api/dashboard/reports/route.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
`  if (!builderTemplate || !isPublishedBuilderTemplate(templateJson)) {
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
  };`,
`  if (!builderTemplate || !isPublishedBuilderTemplate(templateJson)) {
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
      status: "PUBLISHED",
    },
  };`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح احتمال null في templateJson.");
