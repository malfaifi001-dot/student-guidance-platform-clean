const fs = require("fs");

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

/* خلفية هادئة مثل الموقع */
preview = preview.replace(
  `: "min-h-screen bg-slate-50 px-6 py-8"`,
  `: "min-h-screen bg-slate-50 px-6 py-8"`
);

/* زر الرجوع يكون أصغر وأنظف */
preview = preview.replace(
  `className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"`,
  `className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"`
);

/* تقليل المسافة بين الهيدر والتقرير */
preview = preview.replace(
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto mt-6 max-w-[210mm]"}>`,
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto mt-5 max-w-[210mm]"}>`
);

fs.writeFileSync(previewPath, preview, "utf8");

const rendererPath = "components/report-engine/report-builder-pdf-renderer.tsx";
let renderer = fs.readFileSync(rendererPath, "utf8");

/* صفحات التقرير تكون أوضح بدون مبالغة في الحواف */
renderer = renderer.replace(
  `className="pdf-report-page mx-auto rounded-[1.25rem] border border-slate-200 bg-white text-slate-950 shadow-sm print:rounded-none print:border-0 print:shadow-none"`,
  `className="pdf-report-page mx-auto rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm print:rounded-none print:border-0 print:shadow-none"`
);

renderer = renderer.replace(
  `<section className="space-y-6 bg-transparent print:space-y-0" dir="rtl">`,
  `<section className="space-y-5 bg-transparent print:space-y-0" dir="rtl">`
);

fs.writeFileSync(rendererPath, renderer, "utf8");

console.log("تم إعادة تصميم كرت المعاينة بالكامل بشكل أذكى وأنظف.");
