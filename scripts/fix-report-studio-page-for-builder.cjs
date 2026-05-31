const fs = require("fs");

const pagePath = "app/dashboard/reports/[reportId]/studio/page.tsx";
let page = fs.readFileSync(pagePath, "utf8");

/* إزالة مسار Builder القديم الذي كان يمنع فتح محرر التقرير */
page = page.replace(
  /import \{ ReportTemplateLivePreview \} from "@\/components\/report-engine\/report-template-live-preview";\r?\n/g,
  ""
);

page = page.replace(
  /import \{\s*buildBuilderPreviewCaseData,\s*resolveBuilderTemplateForReport,\s*\} from "@\/lib\/report-engine\/report-builder-template-runtime";\r?\n/g,
  ""
);

const start = page.indexOf("  const builderTemplate = await resolveBuilderTemplateForReport(report);");
const end = page.indexOf("  const normalizedReport = {", start);

if (start !== -1 && end !== -1) {
  page = page.slice(0, start) + page.slice(end);
}

fs.writeFileSync(pagePath, page, "utf8");

console.log("تم تنظيف studio/page.tsx وجعل كل التقارير تدخل محرر التقرير.");
