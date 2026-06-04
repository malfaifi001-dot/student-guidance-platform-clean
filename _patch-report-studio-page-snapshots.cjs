const fs = require("fs");

const path = "app\\dashboard\\reports\\[reportId]\\studio\\page.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("templateSnapshot: report.templateSnapshot")) {
  content = content.replace(
    `    hasTemplateSnapshot: Boolean(report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),`,
    `    hasTemplateSnapshot: Boolean(report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
    templateSnapshot: report.templateSnapshot
      ? JSON.parse(JSON.stringify(report.templateSnapshot))
      : null,
    reportDataSnapshot: report.reportDataSnapshot
      ? JSON.parse(JSON.stringify(report.reportDataSnapshot))
      : null,`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("Report studio page now passes templateSnapshot and reportDataSnapshot.");
