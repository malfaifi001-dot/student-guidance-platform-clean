require("dotenv/config");

const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "admin@student-guidance.local";
const ADMIN_PASSWORD = "Admin@12345";

function hashPassword(password) {
  const iterations = 120000;
  const keyLength = 64;
  const digest = "sha512";
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, keyLength, digest)
    .toString("hex");

  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

function createSlug() {
  return "platform-admin";
}

async function main() {
  const slug = createSlug();

  const schoolAccount = await prisma.schoolAccount.upsert({
    where: {
      slug,
    },
    update: {
      name: "إدارة Teachix",
      isActive: true,
    },
    create: {
      name: "إدارة Teachix",
      slug,
      isActive: true,
    },
  });

  await prisma.schoolProfile.upsert({
    where: {
      schoolAccountId: schoolAccount.id,
    },
    update: {
      schoolName: "إدارة Teachix",
      educationDepartment: "الإدارة العامة",
      educationOffice: "إدارة المنصة",
      academicYear: "1447 هـ",
      currentSemester: "الفصل الحالي",
      stage: "إدارة",
    },
    create: {
      schoolAccountId: schoolAccount.id,
      schoolName: "إدارة Teachix",
      educationDepartment: "الإدارة العامة",
      educationOffice: "إدارة المنصة",
      academicYear: "1447 هـ",
      currentSemester: "الفصل الحالي",
      stage: "إدارة",
    },
  });

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: ADMIN_EMAIL,
    },
  });

  const passwordHash = existingAdmin?.passwordHash || hashPassword(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: {
      email: ADMIN_EMAIL,
    },
    update: {
      schoolAccountId: schoolAccount.id,
      name: "مدير المنصة",
      officialName: "مدير Teachix",
      jobTitle: "مدير النظام",
      role: "ADMIN",
      gender: "MALE",
      isActive: true,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      passwordHash,
    },
    create: {
      schoolAccountId: schoolAccount.id,
      name: "مدير المنصة",
      officialName: "مدير Teachix",
      email: ADMIN_EMAIL,
      phone: "0500000000",
      passwordHash,
      role: "ADMIN",
      gender: "MALE",
      jobTitle: "مدير النظام",
      isActive: true,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  });

  console.log("تم تجهيز حساب الأدمن الدائم بنجاح:");
  console.log("--------------------------------------");
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Role:     ${admin.role}`);
  console.log("--------------------------------------");
  console.log("استخدم هذا الحساب دائمًا للإدارة.");
}

main()
  .catch((error) => {
    console.error("حدث خطأ أثناء إنشاء حساب الأدمن:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
