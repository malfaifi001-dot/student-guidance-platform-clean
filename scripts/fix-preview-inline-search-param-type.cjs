const fs = require("fs");

const path = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  نضيف inline إلى نوع searchParams في صفحة preview.
*/
content = content.replace(
`    pdf?: string;
    v?: string;`,
`    pdf?: string;
    inline?: string;
    v?: string;`
);

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة inline إلى نوع searchParams في صفحة preview.");
