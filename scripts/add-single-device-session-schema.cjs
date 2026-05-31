const fs = require("fs");

const schemaPath = "prisma/schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

/* 1) User: add sessions + onboardingSkippedAt */
if (!schema.includes("sessions UserSession[]")) {
  schema = schema.replace(
`  cases CaseEntry[]`,
`  cases    CaseEntry[]
  sessions UserSession[]`
  );
}

if (!schema.includes("onboardingSkippedAt")) {
  schema = schema.replace(
`  onboardingCompleted   Boolean   @default(false)
  onboardingCompletedAt DateTime?`,
`  onboardingCompleted   Boolean   @default(false)
  onboardingCompletedAt DateTime?
  onboardingSkippedAt   DateTime?`
  );
}

/* 2) Add UserSession model */
if (!schema.includes("model UserSession")) {
  schema = schema.replace(
`model SchoolProfile {`,
`model UserSession {
  id String @id @default(cuid())

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  tokenId String @unique

  userAgent String?
  ipAddress String?

  isActive  Boolean   @default(true)
  expiresAt DateTime
  lastSeenAt DateTime @default(now())
  revokedAt DateTime?

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([tokenId])
  @@index([isActive])
  @@index([expiresAt])
}

model SchoolProfile {`
  );
}

fs.writeFileSync(schemaPath, schema, "utf8");

console.log("تم تجهيز UserSession و onboardingSkippedAt.");
