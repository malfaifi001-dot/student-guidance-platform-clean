const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes('href: "/dashboard/admin/activity"')) {
  content = content.replace(
    `{ label: "المستخدمين", href: "/dashboard/admin/users", icon: Users },`,
    `{ label: "المستخدمين", href: "/dashboard/admin/users", icon: Users },
  { label: "سجل العمليات", href: "/dashboard/admin/activity", icon: Activity },`
  );
}

if (!content.includes("Activity,")) {
  content = content.replace("AlertTriangle,", "Activity,\n  AlertTriangle,");
}

fs.writeFileSync(path, content, "utf8");
console.log("تم إضافة سجل العمليات في سايدبار الأدمن.");
