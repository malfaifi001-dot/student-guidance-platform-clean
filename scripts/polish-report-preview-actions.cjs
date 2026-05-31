const fs = require("fs");

/* =========================
   1) Separate report pages visually
========================= */

const rendererPath = "components/report-engine/report-builder-pdf-renderer.tsx";
let renderer = fs.readFileSync(rendererPath, "utf8");

renderer = renderer.replace(
  `<section className="bg-white" dir="rtl">`,
  `<section className="space-y-8 bg-white print:space-y-0" dir="rtl">`
);

renderer = renderer.replace(
  `className="pdf-report-page mx-auto bg-white text-slate-950"`,
  `className="pdf-report-page mx-auto rounded-[1.5rem] border border-slate-200 bg-white text-slate-950 shadow-sm print:rounded-none print:border-0 print:shadow-none"`
);

fs.writeFileSync(rendererPath, renderer, "utf8");

/* =========================
   2) Clean preview page actions
========================= */

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(previewPath, "utf8");

if (!content.includes("const editReportUrl =")) {
  content = content.replace(
    `  const pdfPreviewUrl = \`\${pdfExportUrl}&inline=true\`;`,
    `  const pdfPreviewUrl = \`\${pdfExportUrl}&inline=true\`;

  const editReportUrl = \`/dashboard/reports/\${report.id}/studio\`;`
  );
}

/* Replace current guidance card usage and remove duplicated loose buttons */
content = content.replace(
  /\{!studioMode \? \(\s*<>\s*<ReportPdfGuidanceCard[\s\S]*?<\/>\s*\) : null\}/,
  `{!studioMode ? (
        <ReportPdfGuidanceCard
          reportTitle={report.title}
          serviceName={report.caseEntry.service.name}
          editUrl={editReportUrl}
          pdfPreviewUrl={pdfPreviewUrl}
          pdfDownloadUrl={pdfExportUrl}
        />
      ) : null}`
);

/* Fallback in case there is still a loose buttons block */
content = content.replace(
  /\n\s*<div className="no-print mx-auto mb-4 flex max-w-\[260mm\][\s\S]*?<\/div>\s*\n\s*<\/>\s*\) : null\}/,
  `
      ) : null}`
);

fs.writeFileSync(previewPath, content, "utf8");

console.log("تم تحسين UX صفحة المعاينة: فصل الصفحات، صندوق أزرار موحد، وزر تعديل التقرير.");
