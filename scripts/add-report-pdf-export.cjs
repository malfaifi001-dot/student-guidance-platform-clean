const fs = require("fs");

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(previewPath, "utf8");

if (!content.includes("const pdfExportUrl =")) {
  content = content.replace(
`  const builderPreviewCaseData = builderTemplate
    ? buildBuilderPreviewCaseData(report, reportValues)
    : null;

  return (`,
`  const builderPreviewCaseData = builderTemplate
    ? buildBuilderPreviewCaseData(report, reportValues)
    : null;

  const pdfExportUrl = \`/api/dashboard/reports/\${report.id}/export/pdf?template=\${encodeURIComponent(
    resolvedSearchParams.template || report.templateId || ""
  )}&evidenceLayout=\${encodeURIComponent(
    selectedEvidenceLayout
  )}&cover=\${encodeURIComponent(String(showCover))}&view=\${encodeURIComponent(
    selectedViewMode
  )}\`;

  return (`
  );
}

if (!content.includes("تحميل PDF")) {
  content = content.replace(
`      <section className={studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>`,
`      {!studioMode ? (
        <div className="no-print mx-auto mb-4 flex max-w-[260mm] justify-end">
          <a
            href={pdfExportUrl}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-800"
          >
            تحميل PDF
          </a>
        </div>
      ) : null}

      <section className={studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>`
  );
}

fs.writeFileSync(previewPath, content, "utf8");

console.log("تم إنشاء API تصدير PDF وإضافة زر تحميل PDF في صفحة المعاينة.");
