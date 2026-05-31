const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes('href: "/dashboard/subscription"')) {
  content = content.replace(
`const managementLinks = [
  { label: "حسابي والجلسات", href: "/dashboard/account", icon: UserRound },
  { label: "إعدادات المدرسة", href: "/dashboard/settings/school", icon: Settings },
  { label: "لوحة الأدمن", href: "/dashboard/admin", icon: ShieldCheck },
];`,
`const managementLinks = [
  { label: "التفعيل", href: "/dashboard/subscription", icon: ShieldCheck },
  { label: "حسابي والجلسات", href: "/dashboard/account", icon: UserRound },
  { label: "إعدادات المدرسة", href: "/dashboard/settings/school", icon: Settings },
  { label: "لوحة الأدمن", href: "/dashboard/admin", icon: ShieldCheck },
  { label: "إدارة التفعيلات", href: "/dashboard/admin/activations", icon: KeyRound },
];`
  );
}

if (!content.includes("KeyRound")) {
  content = content.replace("Sparkles,", "Sparkles,\n  KeyRound,");
}

fs.writeFileSync(path, content, "utf8");
console.log("تم إضافة روابط التفعيل في السايدبار.");
