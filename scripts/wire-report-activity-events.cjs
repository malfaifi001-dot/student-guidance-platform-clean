const fs = require("fs");

const path = "app/api/dashboard/reports/route.ts";

if (!fs.existsSync(path)) {
  console.log(`تجاوز: ${path}`);
  process.exit(0);
}

let content = fs.readFileSync(path, "utf8");

const importLine =
  'import { logReportCreatedEvent } from "@/lib/admin/activity-events";';

if (!content.includes(importLine)) {
  const imports = content.match(/^import .+;$/gm);
  const lastImport = imports[imports.length - 1];
  content = content.replace(lastImport, `${lastImport}\n${importLine}`);
}

if (!content.includes("audit-log:report-created")) {
  const logBlock = `
    // audit-log:report-created
    await logReportCreatedEvent({
      reportId: report.id,
      caseEntryId: reportData.id,
      title: report.title,
      templateId,
      serviceSlug: reportData.service.slug,
      evidenceCount: Array.isArray(report.evidenceItems)
        ? report.evidenceItems.length
        : 0,
    });
`;

  content = content.replace(
    /const\s+report\s*=\s*await\s+prisma\.guidanceReport\.create\([\s\S]*?\);\s*/m,
    (match) => `${match}${logBlock}\n`
  );
}

fs.writeFileSync(path, content, "utf8");
console.log("تم ربط إنشاء التقرير بسجل العمليات.");
