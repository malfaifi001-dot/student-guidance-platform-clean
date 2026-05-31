const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes('href: "/dashboard/admin/users"')) {
  content = content.replace(
    `{ label: "مركز الإدارة", href: "/dashboard/admin", icon: LayoutDashboard },`,
    `{ label: "مركز الإدارة", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "المستخدمين", href: "/dashboard/admin/users", icon: Users },`
  );
}

fs.writeFileSync(path, content, "utf8");
console.log("تم إضافة صفحة المستخدمين في سايدبار الأدمن.");
