const fs = require("fs");

const path = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
`    evidences: buildReportEvidences(report).map((item) => ({
      id: item.id,
      title: item.title,
      fileName: item.fileName || item.title,
      fileUrl: item.fileUrl || "",
      imageUrl: item.imageUrl,
      note: item.description || "",
    })),`,
`    evidences: buildReportEvidences(report).map((item) => {
      const evidenceItem = item as ReportEvidence & {
        fileUrl?: string;
      };

      return {
        id: evidenceItem.id,
        title: evidenceItem.title,
        fileName: evidenceItem.fileName || evidenceItem.title,
        fileUrl: evidenceItem.fileUrl || evidenceItem.imageUrl || "",
        imageUrl: evidenceItem.imageUrl,
        note: evidenceItem.description || "",
      };
    }),`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح نوع fileUrl في معاينة قوالب Builder.");
