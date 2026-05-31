const fs = require("fs");

const routePath = "app/api/dashboard/reports/[reportId]/export/pdf/route.ts";
let content = fs.readFileSync(routePath, "utf8");

const marker = `    await page.addStyleTag({
      content: \``;

if (!content.includes(marker)) {
  throw new Error("لم أجد موضع page.addStyleTag داخل route.ts");
}

if (!content.includes("PDF_EXPORT_ISOLATE_REPORT_PAGES")) {
  content = content.replace(
    marker,
`    await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll(".pdf-report-page"));

      if (!pages.length) {
        return;
      }

      const isolatedRoot = document.createElement("main");
      isolatedRoot.setAttribute("dir", "rtl");
      isolatedRoot.setAttribute("data-pdf-export", "PDF_EXPORT_ISOLATE_REPORT_PAGES");

      isolatedRoot.style.margin = "0";
      isolatedRoot.style.padding = "0";
      isolatedRoot.style.background = "#ffffff";
      isolatedRoot.style.width = "100%";

      pages.forEach((page) => {
        isolatedRoot.appendChild(page.cloneNode(true));
      });

      document.body.innerHTML = "";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.background = "#ffffff";
      document.body.appendChild(isolatedRoot);
    });

    await page.addStyleTag({
      content: \``
  );
}

content = content.replace(
  `        .pdf-report-page {
          width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          break-after: page !important;
          page-break-after: always !important;
          margin: 0 auto !important;
        }`,
  `        .pdf-report-page {
          display: block !important;
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          break-after: page !important;
          page-break-after: always !important;
          margin: 0 auto !important;
          background: #ffffff !important;
        }`
);

fs.writeFileSync(routePath, content, "utf8");

console.log("تم عزل صفحات التقرير فقط داخل PDF export.");
