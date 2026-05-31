const fs = require("fs");

const path = "app/api/dashboard/evidence/route.ts";

if (!fs.existsSync(path)) {
  console.log(`تجاوز: ${path}`);
  process.exit(0);
}

let content = fs.readFileSync(path, "utf8");

const importLine =
  'import { logEvidenceUploadedEvent } from "@/lib/admin/activity-events";';

if (!content.includes(importLine)) {
  const imports = content.match(/^import .+;$/gm);
  const lastImport = imports[imports.length - 1];
  content = content.replace(lastImport, `${lastImport}\n${importLine}`);
}

if (!content.includes("audit-log:evidence-uploaded")) {
  const logBlock = `
  // audit-log:evidence-uploaded
  if (uploadedItems.length > 0) {
    await logEvidenceUploadedEvent({
      itemsCount: uploadedItems.length,
      totalSizeBytes: uploadedItems.reduce(
        (sum, item) => sum + (Number(item.size) || 0),
        0
      ),
      fileNames: uploadedItems.map((item) => item.fileName),
      source: "dashboard-evidence-upload",
    });
  }

`;

  content = content.replace(
    /return\s+NextResponse\.json\(\{\s*items:\s*uploadedItems,\s*\}\);/m,
    `${logBlock}  return NextResponse.json({
    items: uploadedItems,
  });`
  );
}

fs.writeFileSync(path, content, "utf8");
console.log("تم ربط رفع الشواهد بسجل العمليات.");
