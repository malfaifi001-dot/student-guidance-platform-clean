const fs = require("fs");

const path = "components/dashboard/soft-blue-dashboard.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  إزالة بلوك البحث الداخلي في الداشبورد لأن الهيدر صار يحتوي البحث العام.
*/
content = content.replace(
`          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ابحث عن طالب، خدمة، حالة أو تقرير..."
              className={\`h-12 w-full rounded-2xl border border-slate-200 bg-white px-12 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 \${theme.focus}\`}
            />
          </div>

`,
""
);

content = content.replace(
`import {
  Activity,`,
`import {
  Activity,`
);

content = content.replace(
`  Search,
  Sparkles,`,
`  Sparkles,`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم حذف البحث المكرر داخل الداشبورد.");
