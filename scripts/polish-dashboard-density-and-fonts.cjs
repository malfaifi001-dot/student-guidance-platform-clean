const fs = require("fs");

/* 1) ضبط Dashboard Layout: مساحة أوسع + خط أوضح */
const layoutPath = "app/dashboard/layout.tsx";
let layout = fs.readFileSync(layoutPath, "utf8");

layout = layout.replace(
`<main className="min-w-0 flex-1">`,
`<main className="min-w-0 flex-1 text-[15.5px] leading-relaxed">`
);

layout = layout.replace(
`<div className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-5 xl:px-6">`,
`<div className="mx-auto w-full max-w-[1680px] px-3 py-4 md:px-4 xl:px-5">`
);

fs.writeFileSync(layoutPath, layout, "utf8");


/* 2) تصغير السايدبار شوي وتكبير وضوح النص */
const sidebarPath = "components/layout/dashboard-sidebar.tsx";
let sidebar = fs.readFileSync(sidebarPath, "utf8");

sidebar = sidebar.replace(
`w-[286px]`,
`w-[264px]`
);

sidebar = sidebar.replace(
`px-4 py-5`,
`px-3 py-4`
);

sidebar = sidebar.replaceAll(
`text-sm font-black`,
`text-[15px] font-black`
);

sidebar = sidebar.replaceAll(
`text-[11px] font-bold`,
`text-[12px] font-bold`
);

sidebar = sidebar.replaceAll(
`text-[11px] font-black`,
`text-[12px] font-black`
);

sidebar = sidebar.replaceAll(
`px-3 py-2.5`,
`px-3 py-2`
);

sidebar = sidebar.replaceAll(
`h-9 w-9`,
`h-9 w-9`
);

sidebar = sidebar.replace(
`mt-8 flex-1 space-y-8`,
`mt-6 flex-1 space-y-6`
);

fs.writeFileSync(sidebarPath, sidebar, "utf8");


/* 3) تنحيف الهيدر وتكبير الخط داخل البحث */
const headerPath = "components/layout/dashboard-header.tsx";
let header = fs.readFileSync(headerPath, "utf8");

header = header.replace(
`px-5 py-3`,
`px-4 py-2.5`
);

header = header.replace(
`max-w-[1500px]`,
`max-w-[1680px]`
);

header = header.replace(
`h-12 w-full rounded-2xl`,
`h-11 w-full rounded-2xl`
);

header = header.replace(
`text-sm font-bold text-slate-700`,
`text-[15px] font-bold text-slate-700`
);

header = header.replaceAll(
`text-xs font-black`,
`text-[13px] font-black`
);

header = header.replaceAll(
`text-[11px] font-bold`,
`text-[12px] font-bold`
);

fs.writeFileSync(headerPath, header, "utf8");


/* 4) ضبط الداشبورد نفسه: أقل ارتفاعًا + خطوط أوضح */
const dashboardPath = "components/dashboard/soft-blue-dashboard.tsx";
let dashboard = fs.readFileSync(dashboardPath, "utf8");

/* المسافات العامة */
dashboard = dashboard.replace(
`<main className="space-y-6 text-slate-900">`,
`<main className="space-y-5 text-slate-900">`
);

dashboard = dashboard.replaceAll(
`space-y-5`,
`space-y-4`
);

/* الهيرو */
dashboard = dashboard.replace(
`rounded-[2rem]`,
`rounded-[1.75rem]`
);

dashboard = dashboard.replace(
`px-6 py-7`,
`px-6 py-6`
);

dashboard = dashboard.replace(
`md:px-10`,
`md:px-8`
);

dashboard = dashboard.replace(
`h-60 w-60`,
`h-56 w-56`
);

/* تكبير العناوين والنصوص المهمة */
dashboard = dashboard.replaceAll(
`text-sm font-bold`,
`text-[15px] font-bold`
);

dashboard = dashboard.replaceAll(
`text-sm font-black`,
`text-[15px] font-black`
);

dashboard = dashboard.replaceAll(
`text-xs font-bold`,
`text-[12px] font-bold`
);

dashboard = dashboard.replaceAll(
`text-xs font-black`,
`text-[12px] font-black`
);

dashboard = dashboard.replaceAll(
`text-base font-black`,
`text-[17px] font-black`
);

dashboard = dashboard.replaceAll(
`text-lg font-black`,
`text-xl font-black`
);

/* البطاقات */
dashboard = dashboard.replaceAll(
`rounded-[1.75rem]`,
`rounded-[1.5rem]`
);

dashboard = dashboard.replaceAll(
`rounded-[1.5rem]`,
`rounded-[1.45rem]`
);

dashboard = dashboard.replaceAll(
`p-5`,
`p-4`
);

dashboard = dashboard.replaceAll(
`px-5 py-4`,
`px-4 py-3`
);

/* الخدمات: تقليل ارتفاع الصور قليلًا */
dashboard = dashboard.replaceAll(
`h-36`,
`h-32`
);

fs.writeFileSync(dashboardPath, dashboard, "utf8");

console.log("تم ضبط الإحساس العام مثل 90% مع تكبير الخط وتحسين المساحات.");
