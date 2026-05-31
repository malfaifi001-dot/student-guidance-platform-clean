const fs = require("fs");

const path = "app/dashboard/reports/new/page.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
`        scope:
          templateJson?.scope === "SERVICE" || template.serviceSlug
            ? "SERVICE"
            : "GLOBAL",`,
`        scope:
          templateJson?.scope === "SERVICE" || template.serviceSlug
            ? ("SERVICE" as const)
            : ("GLOBAL" as const),`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح نوع scope للقوالب المنشورة.");
