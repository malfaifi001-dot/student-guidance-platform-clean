const fs = require("fs");

const schemaPath = "prisma\\schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes("workflowSnapshot Json?")) {
  schema = schema.replace(
    /(\s+workflowId\s+String\?\s*\r?\n\s+workflow\s+Workflow\?\s+@relation\(fields: \[workflowId\], references: \[id\]\))/,
    `$1
  workflowSnapshot Json?`
  );
}

if (!schema.includes("workflowSnapshot Json?")) {
  throw new Error("لم أستطع إضافة workflowSnapshot داخل CaseEntry.");
}

fs.writeFileSync(schemaPath, schema, "utf8");

console.log("workflowSnapshot is available in CaseEntry schema.");
