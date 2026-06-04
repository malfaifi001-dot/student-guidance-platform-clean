const fs = require("fs");

const path = "engine\\cases\\case-runtime-engine.ts";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("guidanceReports: {")) {
  content = content.replace(
`      evidences: {
        orderBy: {
          createdAt: "asc",
        },
      },`,
`      evidences: {
        orderBy: {
          createdAt: "asc",
        },
      },

      guidanceReports: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          templateId: true,
          createdAt: true,
          updatedAt: true,
        },
      },`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("case-runtime-engine getCaseById now includes latest guidance report.");
