const fs = require("fs");

const path = "app/dashboard/admin/page.tsx";

if (!fs.existsSync(path)) {
  console.error("لم يتم العثور على app/dashboard/admin/page.tsx");
  process.exit(1);
}

let content = fs.readFileSync(path, "utf8");

const importLine =
  'import { AdminActivityMetricsPanel } from "@/components/admin/admin-activity-metrics-panel";';

if (!content.includes(importLine)) {
  const imports = content.match(/^import .+;$/gm);
  if (imports?.length) {
    const lastImport = imports[imports.length - 1];
    content = content.replace(lastImport, `${lastImport}\n${importLine}`);
  } else {
    content = `${importLine}\n${content}`;
  }
}

if (content.includes("<AdminActivityMetricsPanel />")) {
  console.log("لوحة المؤشرات موجودة مسبقًا.");
  fs.writeFileSync(path, content, "utf8");
  process.exit(0);
}

const returnWrappedRegex =
  /return\s*\(\s*(<AdminCommandCenter[\s\S]*?\/>)\s*\);/m;

const returnSingleRegex =
  /return\s+(<AdminCommandCenter[\s\S]*?\/>);/m;

if (returnWrappedRegex.test(content)) {
  content = content.replace(
    returnWrappedRegex,
    `return (
    <div className="space-y-5">
      <AdminActivityMetricsPanel />
      $1
    </div>
  );`
  );
} else if (returnSingleRegex.test(content)) {
  content = content.replace(
    returnSingleRegex,
    `return (
    <div className="space-y-5">
      <AdminActivityMetricsPanel />
      $1
    </div>
  );`
  );
} else {
  console.error("لم أستطع العثور على AdminCommandCenter داخل الصفحة. افتح app/dashboard/admin/page.tsx وأرسل محتواه.");
  process.exit(1);
}

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط مؤشرات النشاط في صفحة الأدمن الرئيسية.");
