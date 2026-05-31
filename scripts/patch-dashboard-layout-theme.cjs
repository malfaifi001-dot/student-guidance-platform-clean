const fs = require("fs");

const path = "app/dashboard/layout.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  'className="min-h-screen bg-[#f5f8fc] text-slate-900"',
  'className="min-h-screen bg-[#f5f8fc] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100"'
);

content = content.replace(
  "<DashboardSidebar />",
  "<DashboardSidebar user={current.user} />"
);

fs.writeFileSync(path, content, "utf8");
console.log("تم تحديث DashboardLayout لدعم الدارك مود وتمرير المستخدم للسايدبار.");
