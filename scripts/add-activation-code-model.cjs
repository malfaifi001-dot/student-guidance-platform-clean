const fs = require("fs");

const schemaPath = "prisma/schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes("model ActivationCode")) {
  schema += `

model ActivationCode {
  id String @id @default(cuid())

  code String @unique

  label String?
  durationDays Int @default(30)

  maxUses Int @default(1)
  usedCount Int @default(0)

  isActive Boolean @default(true)

  schoolAccountId String?
  createdById String?
  usedByUserId String?

  startsAt DateTime?
  expiresAt DateTime?
  lastUsedAt DateTime?

  note String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([code])
  @@index([isActive])
  @@index([schoolAccountId])
  @@index([createdById])
  @@index([usedByUserId])
}
`;
}

fs.writeFileSync(schemaPath, schema, "utf8");
console.log("تم تجهيز نموذج ActivationCode داخل Prisma.");
