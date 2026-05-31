const fs = require("fs");

const path = "app/api/dashboard/settings/school/route.ts";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("const logoUrl = String(body?.logoUrl")) {
  content = content.replace(
`    const currentSemester = String(body?.currentSemester || "").trim();`,
`    const currentSemester = String(body?.currentSemester || "").trim();
    const logoUrl = String(body?.logoUrl || "").trim();`
  );
}

content = content.replace(
`          currentSemester,
        },`,
`          currentSemester,
          logoUrl,
        },`
);

content = content.replace(
`          currentSemester,
        },`,
`          currentSemester,
          logoUrl,
        },`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط logoUrl مع حفظ إعدادات المدرسة.");
