const fs = require("fs");

const path = "components/layout/dashboard-header.tsx";
let content = fs.readFileSync(path, "utf8");

const importLine =
  'import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";';

if (!content.includes(importLine)) {
  const imports = content.match(/^import .+;$/gm);
  const lastImport = imports?.[imports.length - 1];

  if (lastImport) {
    content = content.replace(lastImport, `${lastImport}\n${importLine}`);
  } else {
    content = `${importLine}\n${content}`;
  }
}

if (!content.includes("<ThemeToggleButton />")) {
  const notificationButtonPattern =
    /<button[\s\S]*?aria-label="الإشعارات"[\s\S]*?<\/button>/m;

  if (notificationButtonPattern.test(content)) {
    content = content.replace(
      notificationButtonPattern,
      `<ThemeToggleButton />\n\n          $&`
    );
  } else {
    content = content.replace(
      /(<div className="flex flex-1 items-center gap-2 lg:flex-none">)/,
      `$1\n          <ThemeToggleButton />`
    );
  }
}

fs.writeFileSync(path, content, "utf8");
console.log("تمت إضافة زر الوضع الداكن/الفاتح في الهيدر.");
