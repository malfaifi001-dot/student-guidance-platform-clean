const fs = require("fs");

const path = "components/layout/dashboard-header.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `<input
              type="search"`,
  `<input
              suppressHydrationWarning
              type="search"`
);

fs.writeFileSync(path, content, "utf8");
console.log("تم تقليل تحذير hydration الخاص بإضافات المتصفح.");
