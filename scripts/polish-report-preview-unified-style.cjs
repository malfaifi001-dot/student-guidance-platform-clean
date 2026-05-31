const fs = require("fs");

/* =========================
   1) Preview page layout
========================= */

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

/* خلفية الموقع الأساسية بدل السماوي */
preview = preview.replace(
  `: "min-h-screen bg-[#eef8ff] px-6 py-10"`,
  `: "min-h-screen bg-slate-50 px-6 py-8"`
);

/* زر الرجوع بنفس عرض التقرير */
preview = preview.replace(
  `className="no-print mx-auto mb-5 flex max-w-[260mm] justify-start"`,
  `className="no-print mx-auto mb-4 flex max-w-[210mm] justify-start"`
);

/* تحسين زر الرجوع */
preview = preview.replace(
  `className="inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-sky-50"`,
  `className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"`
);

/* خلي مساحة التقرير نفس عرض صندوق التحكم */
preview = preview.replace(
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto mt-8 max-w-[260mm]"}>`,
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto mt-6 max-w-[210mm]"}>`
);

fs.writeFileSync(previewPath, preview, "utf8");

/* =========================
   2) Guidance / actions card
========================= */

const cardPath = "components/reports/report-pdf-guidance-card.tsx";
let card = fs.readFileSync(cardPath, "utf8");

/* نفس عرض A4 */
card = card.replace(
  `className="no-print mx-auto mb-6 max-w-[260mm] rounded-[2rem] border border-sky-100 bg-white/95 p-6 shadow-sm backdrop-blur"`,
  `className="no-print mx-auto mb-6 max-w-[210mm] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"`
);

/* شارة هادئة موحدة مع الموقع */
card = card.replace(
  `className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700"`,
  `className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"`
);

/* صندوق الخطوات */
card = card.replace(
  `className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-600"`,
  `className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-600 shadow-inner"`
);

/* زر تعديل التقرير */
card = card.replace(
  `className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"`,
  `className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"`
);

/* زر معاينة PDF */
card = card.replace(
  `className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800"`,
  `className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"`
);

/* زر تحميل PDF */
card = card.replace(
  `className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"`,
  `className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"`
);

/* تحسين النص التوضيحي */
card = card.replace(
  `يمكنك مراجعة الشكل النهائي، تعديل المحتوى المسموح به، ثم معاينة أو تحميل نسخة PDF الرسمية.`,
  `يمكنك مراجعة الشكل النهائي للتقرير، تعديل المحتوى المسموح به، ثم معاينة نسخة PDF أو تحميلها كنسخة رسمية جاهزة للطباعة.`
);

fs.writeFileSync(cardPath, card, "utf8");

/* =========================
   3) PDF pages visual polish
========================= */

const rendererPath = "components/report-engine/report-builder-pdf-renderer.tsx";
let renderer = fs.readFileSync(rendererPath, "utf8");

/* تقليل المسافة بين صفحات التقرير داخل المعاينة */
renderer = renderer.replace(
  `<section className="space-y-8 bg-white print:space-y-0" dir="rtl">`,
  `<section className="space-y-6 bg-transparent print:space-y-0" dir="rtl">`
);

/* صفحة A4 تبقى بيضاء وهادئة */
renderer = renderer.replace(
  `className="pdf-report-page mx-auto rounded-[1.5rem] border border-slate-200 bg-white text-slate-950 shadow-sm print:rounded-none print:border-0 print:shadow-none"`,
  `className="pdf-report-page mx-auto rounded-[1.25rem] border border-slate-200 bg-white text-slate-950 shadow-sm print:rounded-none print:border-0 print:shadow-none"`
);

fs.writeFileSync(rendererPath, renderer, "utf8");

console.log("تم توحيد خلفية صفحة المعاينة، ضبط عرض A4، وتحسين ألوان الأزرار والتناسق العام.");
