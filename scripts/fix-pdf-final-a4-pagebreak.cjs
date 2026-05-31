const fs = require("fs");

/* =========================
   1) Fix Live Preview A4 pages
========================= */

const livePath = "components/report-engine/report-template-live-preview.tsx";
let live = fs.readFileSync(livePath, "utf8");

live = live.replace(
  `style={
              pdfMode
                ? {
                    pageBreakAfter:
                      pageIndex < template.pages.length - 1 ? "always" : "auto",
                  }
                : undefined
            }`,
  `style={
              pdfMode
                ? {
                    width: "210mm",
                    height: "297mm",
                    maxHeight: "297mm",
                    overflow: "hidden",
                    breakAfter:
                      pageIndex < template.pages.length - 1 ? "page" : "auto",
                    pageBreakAfter:
                      pageIndex < template.pages.length - 1 ? "always" : "auto",
                    breakInside: "avoid",
                    pageBreakInside: "avoid",
                  }
                : undefined
            }`
);

live = live.replace(
  `? "mx-auto h-[297mm] w-[210mm] max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none"`,
  `? "pdf-report-page mx-auto max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none"`
);

live = live.replace(
  `? "h-full overflow-hidden bg-white p-[14mm]"`,
  `? "h-full max-h-full overflow-hidden bg-white p-[10mm]"`
);

live = live.replace(
  `<div className={pdfMode ? "space-y-4 overflow-hidden" : "space-y-5"}>`,
  `<div className={pdfMode ? "max-h-full space-y-3 overflow-hidden" : "space-y-5"}>`
);

live = live.replace(
  `<p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-slate-600">
        {template.description}
      </p>`,
  `<p className="mx-auto mt-4 max-h-16 max-w-xl overflow-hidden text-sm leading-7 text-slate-600">
        {template.description}
      </p>`
);

fs.writeFileSync(livePath, live, "utf8");

/* =========================
   2) Strengthen PDF API print CSS
========================= */

const pdfRoutePath = "app/api/dashboard/reports/[reportId]/export/pdf/route.ts";
let route = fs.readFileSync(pdfRoutePath, "utf8");

route = route.replace(
  `        main {
          background: #ffffff !important;
        }`,
  `        *,
        *::before,
        *::after {
          box-sizing: border-box !important;
        }

        main {
          background: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .pdf-report-page {
          width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          break-after: page !important;
          page-break-after: always !important;
          margin: 0 auto !important;
        }

        .pdf-report-page:last-child {
          break-after: auto !important;
          page-break-after: auto !important;
        }

        img {
          max-width: 100% !important;
        }`
);

fs.writeFileSync(pdfRoutePath, route, "utf8");

console.log("تم تقوية A4 PDF layout ومنع انسكاب الغلاف.");
