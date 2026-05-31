const fs = require("fs");

/* 1) إضافة رابط إعدادات المدرسة في السايدبار */
const sidebarPath = "components/layout/dashboard-sidebar.tsx";
let sidebar = fs.readFileSync(sidebarPath, "utf8");

if (!sidebar.includes('href="/dashboard/settings/school"')) {
  sidebar = sidebar.replace(
`          <Link
            href="/dashboard/admin"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <Settings className="h-5 w-5" />
            لوحة الأدمن
          </Link>`,
`          <Link
            href="/dashboard/settings/school"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <Settings className="h-5 w-5" />
            إعدادات المدرسة
          </Link>

          <Link
            href="/dashboard/admin"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <ShieldCheck className="h-5 w-5" />
            لوحة الأدمن
          </Link>`
  );
}

fs.writeFileSync(sidebarPath, sidebar, "utf8");


/* 2) توحيد صفحة onboarding مع API إعدادات المدرسة */
const onboardingPath = "app/dashboard/onboarding/page.tsx";
let onboarding = fs.readFileSync(onboardingPath, "utf8");

onboarding = onboarding.replace(
`const response = await fetch("/api/dashboard/onboarding", {`,
`const response = await fetch("/api/dashboard/settings/school", {`
);

onboarding = onboarding.replace(
`      window.location.href = data.redirectTo || "/dashboard";`,
`      window.location.href = "/dashboard";`
);

fs.writeFileSync(onboardingPath, onboarding, "utf8");

console.log("تمت إضافة رابط إعدادات المدرسة وتوحيد onboarding مع settings API.");
