const fs = require("fs");

const path = "components/report-engine/report-template-live-preview.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  حذف تمرير pdfMode إلى PreviewBlock.
  ReportTemplateLivePreview خاص بمعاينة Builder فقط،
  أما PDF الرسمي فصار في ReportBuilderPdfRenderer.
*/
content = content.replace(/\r?\n\s*pdfMode=\{pdfMode\}/g, "");

fs.writeFileSync(path, content, "utf8");

console.log("تم حذف pdfMode من PreviewBlock داخل report-template-live-preview.tsx.");
