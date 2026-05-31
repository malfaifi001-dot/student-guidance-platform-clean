const fs = require("fs");

const path = "components/report-engine/report-template-live-preview.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `? "mx-auto h-[297mm] min-h-[297mm] w-[210mm] max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none"`,
  `? "mx-auto h-[297mm] w-[210mm] max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none"`
);

content = content.replace(
  `? "min-h-[297mm] bg-white p-[16mm]"`,
  `? "h-full overflow-hidden bg-white p-[14mm]"`
);

content = content.replace(
  `<div className="space-y-5">`,
  `<div className={pdfMode ? "space-y-4 overflow-hidden" : "space-y-5"}>`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم ضبط ارتفاع صفحات PDF حتى لا تنقسم صفحة الغلاف.");
