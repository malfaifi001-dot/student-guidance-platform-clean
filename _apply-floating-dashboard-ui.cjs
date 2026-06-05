const fs = require("fs");

function updateFile(filePath, updater) {
  const before = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const after = updater(before);

  if (after === before) {
    console.log(`UNCHANGED: ${filePath}`);
  } else {
    fs.writeFileSync(filePath, after, "utf8");
    console.log(`UPDATED: ${filePath}`);
  }
}

updateFile("app/dashboard/layout.tsx", (text) => {
  text = text.replace(
    `    <div dir="rtl" className="min-h-screen bg-[#f5f8fc] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">`,
    `    <div dir="rtl" className="min-h-screen bg-[#f5f8fc] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen gap-4 p-3 md:p-4">`
  );

  text = text.replace(
    `        <main className="min-w-0 flex-1 text-[15.5px] leading-relaxed">`,
    `        <main className="min-w-0 flex-1 text-[15.5px] leading-relaxed">`
  );

  text = text.replace(
    `          <div className="mx-auto w-full max-w-[1680px] px-3 py-4 md:px-4 xl:px-5">`,
    `          <div className="mx-auto w-full max-w-[1680px] py-4">`
  );

  return text;
});

updateFile("components/layout/dashboard-sidebar.tsx", (text) => {
  text = text.replace(
    `"hidden min-h-screen shrink-0 border-l border-slate-200 bg-white px-3 py-4 transition-all duration-300 xl:block",
        collapsed ? "w-[82px]" : "w-[236px]",`,
    `"sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 overflow-hidden rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-3 shadow-xl shadow-slate-200/60 backdrop-blur-xl transition-all duration-300 xl:block",
        collapsed ? "w-[86px]" : "w-[252px]",`
  );

  text = text.replace(
    `<nav className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">`,
    `<nav className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1 pl-1">`
  );

  text = text.replace(
    `<div className="mt-5 rounded-[1.35rem] border border-sky-100 bg-sky-50 p-4">`,
    `<div className="mt-5 rounded-[1.35rem] border border-sky-100 bg-sky-50/80 p-4">`
  );

  return text;
});

updateFile("components/layout/dashboard-header.tsx", (text) => {
  text = text.replace(
    `    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f7faff]/85 px-4 py-2.5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4">`,
    `    <header className="sticky top-3 z-30 px-0">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 rounded-[2rem] border border-slate-200/80 bg-white/90 px-4 py-3 shadow-lg shadow-slate-200/60 backdrop-blur-xl">`
  );

  text = text.replace(
    `className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-12 text-[15px] font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-50"`,
    `className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-12 text-[15px] font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:bg-white focus:ring-4 focus:ring-sky-50"`
  );

  return text;
});

console.log("تم تطبيق Floating UI على الداشبورد.");
