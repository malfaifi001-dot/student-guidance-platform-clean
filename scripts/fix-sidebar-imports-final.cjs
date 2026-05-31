const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  1) إصلاح import الخاطئ:
  صار عندك:
  import { Activity, usePathname } from "next/navigation";
  والصحيح أن next/navigation يأخذ usePathname فقط.
*/
content = content.replace(
  /import\s*\{\s*Activity,\s*usePathname\s*\}\s*from\s*"next\/navigation";/g,
  'import { usePathname } from "next/navigation";'
);

content = content.replace(
  /import\s*\{\s*usePathname\s*\}\s*from\s*"next\/navigation";/g,
  'import { usePathname } from "next/navigation";'
);

/*
  2) إضافة Activity داخل import الخاص بـ lucide-react فقط.
*/
const lucideImportRegex = /import\s*\{([\s\S]*?)\}\s*from\s*"lucide-react";/m;

content = content.replace(lucideImportRegex, (match, icons) => {
  if (icons.includes("Activity")) {
    return match;
  }

  return `import {\n  Activity,\n${icons}\n} from "lucide-react";`;
});

/*
  3) تنظيف لو تكرر Activity داخل lucide-react.
*/
content = content.replace(
  /import\s*\{([\s\S]*?)\}\s*from\s*"lucide-react";/m,
  (match, icons) => {
    const uniqueIcons = Array.from(
      new Set(
        icons
          .split(",")
          .map((icon) => icon.trim())
          .filter(Boolean)
      )
    ).sort();

    return `import {\n  ${uniqueIcons.join(",\n  ")},\n} from "lucide-react";`;
  }
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح استيراد Activity: الآن Activity من lucide-react و usePathname من next/navigation.");
