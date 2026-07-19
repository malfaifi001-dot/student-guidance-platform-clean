const fs = require("fs");
const path = require("path");

const serviceNames = {
  "guidance-programs": "البرامج الإرشادية",
  "committees-meetings": "اللجان والاجتماعات",
  "student-follow-up": "متابعة الطلاب",
  "student-guidance-services": "الخدمات الإرشادية المقدمة للطلاب",
  "family-school-communication": "التواصل بين الأسرة والمدرسة",
  "counselor-reference-library": "المرجع الشامل",
  "results-analysis": "تحليل النتائج",
  "reports": "التقارير",
};

const serviceDescriptions = {
  "guidance-programs": "إدارة البرامج الإرشادية وخطط التنفيذ.",
  "committees-meetings": "إدارة محاضر اللجان والاجتماعات والتوصيات.",
  "student-follow-up": "متابعة الطلاب والحالات الطلابية.",
  "student-guidance-services": "إدارة الخدمات الإرشادية المقدمة للطلاب.",
  "family-school-communication": "توثيق التواصل بين الأسرة والمدرسة.",
  "counselor-reference-library": "مكتبة الحقائب والأدلة والملفات المهنية الخاصة بالموجه الطلابي.",
  "results-analysis": "رفع وتحليل نتائج الطلاب.",
  "reports": "إنشاء ومعاينة واعتماد التقارير.",
};

const replacements = new Map([
  ["التواصل الأسري", "التواصل بين الأسرة والمدرسة"],
  ["التواصل بين الأسرة و المدرسة", "التواصل بين الأسرة والمدرسة"],
  ["التواصل بين الاسرة والمدرسة", "التواصل بين الأسرة والمدرسة"],
  ["التواصل بين الأسرة والمدرسة", "التواصل بين الأسرة والمدرسة"],

  ["الخدمات التوجيهية", "الخدمات الإرشادية المقدمة للطلاب"],
  ["الخدمات التوجيهية المقدمة للطلاب", "الخدمات الإرشادية المقدمة للطلاب"],
  ["الخدمات الارشادية المقدمة للطلاب", "الخدمات الإرشادية المقدمة للطلاب"],

  ["السجل الشامل للطالب", "المرجع الشامل"],
  ["السجل الشامل", "المرجع الشامل"],
  ["المرجع الشامل الموجه الطلابي", "المرجع الشامل"],

  ["البرامج الارشادية", "البرامج الإرشادية"],
  ["اللجان و الاجتماعات", "اللجان والاجتماعات"],

  ["التقرير", "التقارير"],
]);

function writeServicesConstants() {
  const filePath = "lib/constants/services.ts";

  const content = `export type AppService = {
  slug: string;
  title: string;
  description: string;
  href: string;
  kind: "workflow" | "standalone" | "admin";
};

export const workflowServices: AppService[] = [
  {
    slug: "guidance-programs",
    title: "${serviceNames["guidance-programs"]}",
    description: "${serviceDescriptions["guidance-programs"]}",
    href: "/dashboard/guidance-programs",
    kind: "workflow",
  },
  {
    slug: "student-follow-up",
    title: "${serviceNames["student-follow-up"]}",
    description: "${serviceDescriptions["student-follow-up"]}",
    href: "/dashboard/student-follow-up",
    kind: "workflow",
  },
  {
    slug: "committees-meetings",
    title: "${serviceNames["committees-meetings"]}",
    description: "${serviceDescriptions["committees-meetings"]}",
    href: "/dashboard/committees-meetings",
    kind: "workflow",
  },
  {
    slug: "family-school-communication",
    title: "${serviceNames["family-school-communication"]}",
    description: "${serviceDescriptions["family-school-communication"]}",
    href: "/dashboard/family-school-communication",
    kind: "workflow",
  },
  {
    slug: "student-guidance-services",
    title: "${serviceNames["student-guidance-services"]}",
    description: "${serviceDescriptions["student-guidance-services"]}",
    href: "/dashboard/student-guidance-services",
    kind: "workflow",
  },
];

export const standaloneServices: AppService[] = [
  {
    slug: "counselor-reference-library",
    title: "${serviceNames["counselor-reference-library"]}",
    description: "${serviceDescriptions["counselor-reference-library"]}",
    href: "/dashboard/counselor-reference-library",
    kind: "standalone",
  },
  {
    slug: "results-analysis",
    title: "${serviceNames["results-analysis"]}",
    description: "${serviceDescriptions["results-analysis"]}",
    href: "/dashboard/results-analysis",
    kind: "standalone",
  },
  {
    slug: "reports",
    title: "${serviceNames["reports"]}",
    description: "${serviceDescriptions["reports"]}",
    href: "/dashboard/reports",
    kind: "standalone",
  },
];

export const dashboardServices = [
  ...workflowServices,
  ...standaloneServices,
];
`;

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`UPDATED: ${filePath}`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        ["node_modules", ".next", ".git", "prisma/backups"].some((skip) =>
          fullPath.includes(skip)
        )
      ) {
        return [];
      }

      return walk(fullPath);
    }

    if (!/\.(tsx|ts|jsx|js|cjs|mjs)$/.test(entry.name)) {
      return [];
    }

    return [fullPath];
  });
}

function replaceInProjectFiles() {
  const files = [
    ...walk("app"),
    ...walk("components"),
    ...walk("lib"),
    ...walk("engine"),
  ];

  for (const filePath of files) {
    let text = fs.readFileSync(filePath, "utf8");
    const before = text;

    for (const [from, to] of replacements.entries()) {
      text = text.split(from).join(to);
    }

    for (const [slug, name] of Object.entries(serviceNames)) {
      const patterns = [
        new RegExp(`title="[^"]*"(?=[\\s\\S]{0,300}serviceSlug="${slug}")`, "g"),
        new RegExp(`serviceSlug="${slug}"([\\s\\S]{0,300})title="[^"]*"`, "g"),
      ];

      for (const pattern of patterns) {
        text = text.replace(pattern, (match) => {
          return match.replace(/title="[^"]*"/, `title="${name}"`);
        });
      }
    }

    if (text !== before) {
      fs.writeFileSync(filePath, text, "utf8");
      console.log(`UPDATED: ${filePath}`);
    }
  }
}

writeServicesConstants();
replaceInProjectFiles();

console.log("تم توحيد أسماء الخدمات داخل ملفات المشروع.");
