const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes('href: "/dashboard/admin/subscribers"')) {
  content = content.replace(
    `{ label: "الاشتراكات", href: "/dashboard/admin/subscriptions", icon: Crown },`,
    `{ label: "الاشتراكات", href: "/dashboard/admin/subscriptions", icon: Crown },
  { label: "المشتركين", href: "/dashboard/admin/subscribers", icon: Users },`
  );
}

fs.writeFileSync(path, content, "utf8");
console.log("تم إضافة صفحة المشتركين في سايدبار الأدمن.");
