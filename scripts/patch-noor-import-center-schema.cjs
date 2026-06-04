const fs = require("fs");

const schemaPath = "prisma/schema.prisma";

if (!fs.existsSync(schemaPath)) {
  throw new Error("لم يتم العثور على prisma/schema.prisma");
}

let schema = fs.readFileSync(schemaPath, "utf8");

function ensureModelField(modelName, fieldKey, fieldLine) {
  const pattern = new RegExp(`model\\s+${modelName}\\s*\\{[\\s\\S]*?\\n\\}`);
  const match = schema.match(pattern);

  if (!match) {
    console.log(`لم يتم العثور على model ${modelName}`);
    return;
  }

  const block = match[0];
  const body = block
    .replace(new RegExp(`model\\s+${modelName}\\s*\\{`), "")
    .replace(/\n\}$/, "");

  const fieldPattern = new RegExp(`^\\s*${fieldKey}\\s+`, "m");

  if (fieldPattern.test(body)) {
    return;
  }

  const updatedBlock = block.replace(/\n\}$/, `\n  ${fieldLine}\n}`);
  schema = schema.replace(block, updatedBlock);
}

ensureModelField("StudentImportSession", "academicYear", "academicYear String?");
ensureModelField("StudentImportSession", "term", "term String?");
ensureModelField("StudentImportSession", "importMode", 'importMode String @default("FULL_SYNC")');
ensureModelField("StudentImportSession", "committedByUserId", "committedByUserId String?");
ensureModelField("StudentImportSession", "isArchived", "isArchived Boolean @default(false)");
ensureModelField("StudentImportSession", "archivedAt", "archivedAt DateTime?");
ensureModelField("StudentImportSession", "archivedByUserId", "archivedByUserId String?");

ensureModelField("StudentImportRow", "planAction", "planAction String?");

if (!/model\s+StudentImportChange\s*\{/.test(schema)) {
  schema += `

model StudentImportChange {
  id String @id @default(cuid())

  sessionId String
  rowId     String?
  studentId String?

  action String

  beforeJson Json?
  afterJson  Json?

  rolledBackAt DateTime?
  createdAt    DateTime @default(now())

  @@index([sessionId])
  @@index([studentId])
  @@index([action])
}
`;
}

fs.writeFileSync(schemaPath, schema, "utf8");

console.log("تم تحديث schema لمركز استيراد نور بدون تكرار.");
