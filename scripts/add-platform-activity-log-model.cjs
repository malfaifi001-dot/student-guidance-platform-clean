const fs = require("fs");

const schemaPath = "prisma/schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes("model PlatformActivityLog")) {
  schema += `

model PlatformActivityLog {
  id String @id @default(cuid())

  actorUserId String?
  targetUserId String?
  schoolAccountId String?

  category String
  action String
  severity String @default("INFO")

  title String
  details Json?

  ipAddress String?
  userAgent String?

  createdAt DateTime @default(now())

  @@index([actorUserId])
  @@index([targetUserId])
  @@index([schoolAccountId])
  @@index([category])
  @@index([action])
  @@index([createdAt])
}
`;
}

fs.writeFileSync(schemaPath, schema, "utf8");
console.log("تم تجهيز PlatformActivityLog في Prisma.");
