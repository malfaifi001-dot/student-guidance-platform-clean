const fs = require("fs");

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

/* نخلي الرجوع صغير ومتمركز مع التقرير */
preview = preview.replace(
  /className="no-print mx-auto mb-4 flex max-w-\[210mm\] justify-start"/g,
  `className="no-print mx-auto mb-3 flex max-w-[210mm] justify-start"`
);

preview = preview.replace(
  /className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2\.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"/g,
  `className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"`
);

/* قرب التقرير من شريط التحكم */
preview = preview.replace(
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto mt-5 max-w-[210mm]"}>`,
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto mt-4 max-w-[210mm]"}>`
);

fs.writeFileSync(previewPath, preview, "utf8");

const rendererPath = "components/report-engine/report-builder-pdf-renderer.tsx";
let renderer = fs.readFileSync(rendererPath, "utf8");

/* تقليل المسافة بين صفحات A4 */
renderer = renderer.replace(
  `<section className="space-y-5 bg-transparent print:space-y-0" dir="rtl">`,
  `<section className="space-y-4 bg-transparent print:space-y-0" dir="rtl">`
);

fs.writeFileSync(rendererPath, renderer, "utf8");

console.log("تم تحويل كرت المعاينة إلى شريط إجراءات احترافي أعلى التقرير.");
