const fs = require("fs");

const schemaPath = "prisma/schema.prisma";

if (!fs.existsSync(schemaPath)) {
  throw new Error("لم يتم العثور على prisma/schema.prisma");
}

let schema = fs.readFileSync(schemaPath, "utf8");

function removeDuplicateBlocks(kind, name) {
  const pattern = new RegExp(`\\n?${kind}\\s+${name}\\s*\\{[\\s\\S]*?\\n\\}`, "g");
  let seen = false;

  schema = schema.replace(pattern, (block) => {
    if (!seen) {
      seen = true;
      return block.startsWith("\n") ? block : `\n${block}`;
    }

    return "";
  });
}

function removeDuplicateSchoolAccountRelation() {
  const pattern = /model\s+SchoolAccount\s*\{[\s\S]*?\n\}/;

  schema = schema.replace(pattern, (block) => {
    let seen = false;

    const lines = block.split(/\r?\n/).filter((line) => {
      if (line.trim() === "studentImportSessions StudentImportSession[]") {
        if (seen) {
          return false;
        }

        seen = true;
      }

      return true;
    });

    return lines.join("\n");
  });
}

removeDuplicateSchoolAccountRelation();

removeDuplicateBlocks("enum", "ImportSessionStatus");
removeDuplicateBlocks("enum", "ImportRowStatus");
removeDuplicateBlocks("model", "StudentImportSession");
removeDuplicateBlocks("model", "StudentImportFile");
removeDuplicateBlocks("model", "StudentImportRow");

fs.writeFileSync(schemaPath, schema, "utf8");

console.log("تم تنظيف تكرارات Prisma الخاصة باستيراد نور.");
