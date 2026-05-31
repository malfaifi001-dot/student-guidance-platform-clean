const fs = require("fs");

const path = "app/api/dashboard/reports/[reportId]/export/pdf/route.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
`    return new NextResponse(pdfBuffer, {
      status: 200,`,
`    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم تحويل pdfBuffer إلى Uint8Array حتى يقبله NextResponse.");
