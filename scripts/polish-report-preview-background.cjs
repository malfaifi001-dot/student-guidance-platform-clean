const fs = require("fs");

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(previewPath, "utf8");

/* 1) Add back URL */
if (!content.includes("const backToReportsUrl =")) {
  content = content.replace(
    `  const editReportUrl = \`/dashboard/reports/\${report.id}/studio\`;`,
    `  const editReportUrl = \`/dashboard/reports/\${report.id}/studio\`;

  const backToReportsUrl = "/dashboard/reports";`
  );
}

/* 2) Improve preview page background and spacing */
content = content.replace(
  `pdfMode
          ? "min-h-screen bg-white p-0"
          : studioMode
            ? "min-h-screen bg-slate-100 py-5"
            : "min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0,_#f8fafc_34%,_#f1f5f9_100%)] px-6 py-6"`,
  `pdfMode
          ? "min-h-screen bg-white p-0"
          : studioMode
            ? "min-h-screen bg-slate-100 py-5"
            : "min-h-screen bg-[#eef8ff] px-6 py-10"`
);

/* 3) Add top back button before guidance card */
if (!content.includes("الرجوع للتقارير")) {
  content = content.replace(
    `      {!studioMode ? (
        <ReportPdfGuidanceCard`,
    `      {!studioMode ? (
        <div className="no-print mx-auto mb-5 flex max-w-[260mm] justify-start">
          <a
            href={backToReportsUrl}
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-sky-50"
          >
            <span aria-hidden="true">←</span>
            الرجوع للتقارير
          </a>
        </div>
      ) : null}

      {!studioMode ? (
        <ReportPdfGuidanceCard`
  );
}

/* 4) Add breathing space above report document */
content = content.replace(
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>`,
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto mt-8 max-w-[260mm]"}>`
);

fs.writeFileSync(previewPath, content, "utf8");

/* 5) Polish guidance card background to match sky page */
const cardPath = "components/reports/report-pdf-guidance-card.tsx";
let card = fs.readFileSync(cardPath, "utf8");

card = card.replace(
  `className="no-print mx-auto mb-6 max-w-[260mm] rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm"`,
  `className="no-print mx-auto mb-6 max-w-[260mm] rounded-[2rem] border border-sky-100 bg-white/95 p-6 shadow-sm backdrop-blur"`
);

card = card.replace(
  `className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"`,
  `className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700"`
);

card = card.replace(
  `className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"`,
  `className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800"`
);

fs.writeFileSync(cardPath, card, "utf8");

console.log("تم توحيد الخلفية، إضافة زر الرجوع، وتحسين المسافات حول التقرير.");
