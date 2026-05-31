const fs = require("fs");

const path = "components/report-engine/report-template-live-preview.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  /\s+pdfMode=\{pdfMode\}/g,
  ""
);

fs.writeFileSync(path, content, "utf8");

console.log("تم حذف تمرير pdfMode من PreviewBlock داخل LivePreview.");
