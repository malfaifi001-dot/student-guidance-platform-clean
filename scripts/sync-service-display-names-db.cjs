const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const serviceNames = {
  "guidance-programs": {
    name: "البرامج الإرشادية",
    description: "إدارة البرامج الإرشادية وخطط التنفيذ.",
  },
  "committees-meetings": {
    name: "اللجان والاجتماعات",
    description: "إدارة محاضر اللجان والاجتماعات والتوصيات.",
  },
  "student-follow-up": {
    name: "متابعة الطلاب",
    description: "متابعة الطلاب والحالات الطلابية.",
  },
  "student-guidance-services": {
    name: "الخدمات الإرشادية المقدمة للطلاب",
    description: "إدارة الخدمات الإرشادية المقدمة للطلاب.",
  },
  "family-school-communication": {
    name: "التواصل بين الأسرة والمدرسة",
    description: "توثيق التواصل بين الأسرة والمدرسة.",
  },
  "counselor-reference-library": {
    name: "المرجع الشامل",
    description: "مكتبة الحقائب والأدلة والملفات المهنية الخاصة بالموجه الطلابي.",
  },
  "results-analysis": {
    name: "تحليل النتائج",
    description: "رفع وتحليل نتائج الطلاب.",
  },
  "reports": {
    name: "التقارير",
    description: "إنشاء ومعاينة واعتماد التقارير.",
  },
};

async function main() {
  for (const [slug, data] of Object.entries(serviceNames)) {
    await prisma.service.upsert({
      where: { slug },
      update: {
        name: data.name,
        description: data.description,
      },
      create: {
        slug,
        name: data.name,
        description: data.description,
        status: "ACTIVE",
      },
    });

    console.log(`SYNCED: ${slug} => ${data.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
