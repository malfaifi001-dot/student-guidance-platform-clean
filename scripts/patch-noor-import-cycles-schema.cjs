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
    throw new Error(`لم يتم العثور على model ${modelName}`);
  }

  const block = match[0];
  const body = block
    .replace(new RegExp(`model\\s+${modelName}\\s*\\{`), "")
    .replace(/\n\}$/, "");

  const fieldPattern = new RegExp(`^\\s*${fieldKey}\\s+`, "m");

  if (fieldPattern.test(body)) {
    console.log(`موجود مسبقًا: ${modelName}.${fieldKey}`);
    return;
  }

  const updatedBlock = block.replace(/\n\}$/, `\n  ${fieldLine}\n}`);
  schema = schema.replace(block, updatedBlock);
  console.log(`تمت الإضافة: ${modelName}.${fieldKey}`);
}

ensureModelField("StudentImportSession", "cycleId", "cycleId String?");

if (!/model\s+NoorImportCycle\s*\{/.test(schema)) {
  schema += `

model NoorImportCycle {
  id String @id @default(cuid())

  schoolAccountId String
  academicYear    String
  term            String
  title           String
  status          String  @default("DRAFT")

  totalStudents     Int @default(0)
  totalSessions     Int @default(0)
  pendingSessions   Int @default(0)
  committedSessions Int @default(0)

  latestSessionId   String?
  latestCommittedAt DateTime?

  isArchived      Boolean   @default(false)
  archivedAt      DateTime?
  archivedByUserId String?
  createdByUserId  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([schoolAccountId])
  @@index([schoolAccountId, academicYear, term])
  @@index([status])
}
`;
  console.log("تمت إضافة model NoorImportCycle");
} else {
  console.log("موجود مسبقًا: NoorImportCycle");
}

fs.writeFileSync(schemaPath, schema, "utf8");
console.log("تم تجهيز schema لبطاقات بيانات نور.");
