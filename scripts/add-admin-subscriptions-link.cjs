const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes('href: "/dashboard/admin/subscriptions"')) {
  content = content.replace(
    `{ label: "إدارة التفعيلات", href: "/dashboard/admin/activations", icon: KeyRound },`,
    `{ label: "إدارة التفعيلات", href: "/dashboard/admin/activations", icon: KeyRound },
  { label: "إدارة الاشتراكات", href: "/dashboard/admin/subscriptions", icon: Crown },`
  );
}

if (!content.includes("Crown")) {
  content = content.replace("KeyRound,", "KeyRound,\n  Crown,");
}

fs.writeFileSync(path, content, "utf8");
console.log("تم إضافة إدارة الاشتراكات في السايدبار.");
