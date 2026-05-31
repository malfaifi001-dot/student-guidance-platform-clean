const fs = require("fs");

const schemaPath = "prisma/schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

/* User fields */
if (!schema.includes("phone            String?")) {
  schema = schema.replace(
`  name         String
  email        String   @unique
  passwordHash String?
  role         UserRole @default(COUNSELOR)
  gender       Gender   @default(UNKNOWN)
  isActive     Boolean  @default(true)`,
`  name         String
  email        String   @unique
  phone        String?
  passwordHash String?
  role         UserRole @default(COUNSELOR)
  gender       Gender   @default(UNKNOWN)
  officialName String?
  jobTitle     String?
  isActive     Boolean  @default(true)

  onboardingCompleted   Boolean   @default(false)
  onboardingCompletedAt DateTime?`
  );
}

/* SchoolProfile fields */
if (!schema.includes("educationDepartment String?")) {
  schema = schema.replace(
`  schoolName      String
  principalName   String?
  city            String?
  district        String?
  academicYear    String?
  currentSemester String?`,
`  schoolName          String
  principalName       String?
  educationDepartment String?
  educationOffice     String?
  city                String?
  district            String?
  stage               String?
  academicYear        String?
  currentSemester     String?
  logoUrl             String?`
  );
}

fs.writeFileSync(schemaPath, schema, "utf8");
console.log("تم تحديث Prisma schema للتسجيل والـ onboarding.");
