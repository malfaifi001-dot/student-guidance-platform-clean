const fs = require("fs");

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(previewPath, "utf8");

/* 1) Remove Builder LivePreview import from report preview */
content = content.replace(
  /import \{ ReportTemplateLivePreview \} from "@\/components\/report-engine\/report-template-live-preview";\r?\n/g,
  ""
);

/* 2) Keep only ReportViewMode type import, remove ReportPreviewToolbar component */
content = content.replace(
  /import \{\s*ReportPreviewToolbar,\s*type ReportViewMode,\s*\} from "@\/components\/reports\/report-preview-toolbar";/g,
  `import type { ReportViewMode } from "@/components/reports/report-preview-toolbar";`
);

/* 3) Make PDF preview open actual PDF inline, not dashboard preview page */
content = content.replace(
  /  const pdfPreviewUrl = `[\s\S]*?`;\r?\n/,
  `  const pdfPreviewUrl = \`\${pdfExportUrl}&inline=true\`;\n`
);

/* 4) Remove the old report settings card from preview page */
content = content.replace(
  /\n\s*\{!studioMode \? \(\s*<ReportPreviewToolbar[\s\S]*?\/>\s*\) : null\}\r?\n/g,
  "\n"
);

/* 5) In normal preview, show the official PDF-style renderer, not Builder LivePreview */
content = content.replace(
  /\{builderTemplate && pdfMode \? \([\s\S]*?<ReportBuilderPdfRenderer[\s\S]*?\/>\s*\) : builderTemplate \? \([\s\S]*?<ReportTemplateLivePreview[\s\S]*?\/>\s*\) : \(/,
  `{builderTemplate ? (
          <ReportBuilderPdfRenderer
            template={builderTemplate}
            previewCaseData={builderPreviewCaseData as any}
            identity={identity}
          />
        ) : (`
);

fs.writeFileSync(previewPath, content, "utf8");

/* 6) Make export API support inline PDF preview */
const routePath = "app/api/dashboard/reports/[reportId]/export/pdf/route.ts";
let route = fs.readFileSync(routePath, "utf8");

route = route.replace(
  `"Content-Disposition": \`attachment; filename="guidance-report-\${reportId}.pdf"\`,`,
  `"Content-Disposition": \`\${requestUrl.searchParams.get("inline") === "true" ? "inline" : "attachment"}; filename="guidance-report-\${reportId}.pdf"\`,`
);

fs.writeFileSync(routePath, route, "utf8");

console.log("تم تنظيف صفحة المعاينة: إزالة صندوق الإعدادات، واستخدام التصميم الرسمي، وفتح PDF inline.");
