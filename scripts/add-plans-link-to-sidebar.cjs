const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes('href: "/dashboard/plans"')) {
  content = content.replace(
    `{ label: "التفعيل", href: "/dashboard/subscription", icon: ShieldCheck },`,
    `{ label: "التفعيل", href: "/dashboard/subscription", icon: ShieldCheck },
  { label: "الباقات", href: "/dashboard/plans", icon: Crown },`
  );
}

if (!content.includes("Crown")) {
  content = content.replace("KeyRound,", "KeyRound,\n  Crown,");
}

fs.writeFileSync(path, content, "utf8");
console.log("تم إضافة رابط الباقات.");
