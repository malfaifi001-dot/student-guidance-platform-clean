const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("Activity,")) {
  content = content.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*"lucide-react";/,
    (match, icons) => {
      const cleanedIcons = icons.trim();
      return `import {\n  Activity,\n  ${cleanedIcons}\n} from "lucide-react";`;
    }
  );
}

fs.writeFileSync(path, content, "utf8");
console.log("تم إصلاح استيراد Activity في السايدبار.");
