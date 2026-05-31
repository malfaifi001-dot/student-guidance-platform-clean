const fs = require("fs");

const path = "components/dashboard/soft-blue-dashboard.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  حذف بلوك البحث الداخلي بالكامل من داخل الداشبورد.
  السبب: البحث صار موجود في DashboardHeader، فلا نريد تكراره.
*/
content = content.replace(
/\s*<div className="relative max-w-xl">\s*<Search[\s\S]*?<\/div>\s*\n/,
"\n"
);

/*
  تنظيف import Search لو كان موجود.
*/
content = content.replace(/,\s*Search/g, "");
content = content.replace(/\s*Search,\n/g, "");

fs.writeFileSync(path, content, "utf8");

console.log("تم حذف البحث الداخلي وتنظيف Search import.");
