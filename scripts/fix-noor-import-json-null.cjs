const fs = require("fs");

const filePath = "app/api/dashboard/data-center/noor-import/[sessionId]/commit/route.ts";

if (!fs.existsSync(filePath)) {
  throw new Error("لم يتم العثور على ملف commit route");
}

let content = fs.readFileSync(filePath, "utf8");

if (!content.includes('import { Prisma } from "@prisma/client";')) {
  content = content.replace(
    'import { NextResponse } from "next/server";',
    'import { NextResponse } from "next/server";\nimport { Prisma } from "@prisma/client";'
  );
}

content = content.replace(
  /function compactStudentSnapshot\(student: any\) \{\s*if \(!student\) \{\s*return null;\s*\}\s*return \{([\s\S]*?)\};\s*\}/,
  `function compactStudentSnapshot(student: any): Prisma.InputJsonValue {
  return {$1};
}`
);

content = content.replaceAll("beforeJson: null,", "beforeJson: Prisma.JsonNull,");

fs.writeFileSync(filePath, content, "utf8");

console.log("تم إصلاح Json null في commit route.");
