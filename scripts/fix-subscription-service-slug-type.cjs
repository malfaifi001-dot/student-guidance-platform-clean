const fs = require("fs");

const path = "app/api/dashboard/admin/subscriptions/route.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `...enabledServiceSlugs.map((serviceSlug) => ({`,
  `...enabledServiceSlugs.map((serviceSlug: string) => ({`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح نوع serviceSlug.");
