const fs = require("fs");

/* تمرير user إلى DashboardHeader من layout */
const layoutPath = "app/dashboard/layout.tsx";
let layout = fs.readFileSync(layoutPath, "utf8");

layout = layout.replace(
`          <DashboardHeader />`,
`          <DashboardHeader user={current.user} />`
);

fs.writeFileSync(layoutPath, layout, "utf8");


/* إضافة حسابي إلى السايدبار */
const sidebarPath = "components/layout/dashboard-sidebar.tsx";
let sidebar = fs.readFileSync(sidebarPath, "utf8");

if (!sidebar.includes("UserRound")) {
  sidebar = sidebar.replace(
`  Users,`,
`  Users,
  UserRound,`
  );
}

if (!sidebar.includes('href="/dashboard/account"')) {
  sidebar = sidebar.replace(
`        <div className="pt-4">
          <p className="mb-2 px-4 text-xs font-bold text-slate-400">الإدارة</p>`,
`        <div className="pt-4">
          <p className="mb-2 px-4 text-xs font-bold text-slate-400">الحساب</p>

          <Link
            href="/dashboard/account"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <UserRound className="h-5 w-5" />
            حسابي والجلسات
          </Link>
        </div>

        <div className="pt-4">
          <p className="mb-2 px-4 text-xs font-bold text-slate-400">الإدارة</p>`
  );
}

fs.writeFileSync(sidebarPath, sidebar, "utf8");

console.log("تم تطوير الهيدر وإضافة صفحة حسابي في السايدبار.");
