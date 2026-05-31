const fs = require("fs");

const targets = [
  {
    path: "app/api/dashboard/student-follow-up/route.ts",
    guard: 'requireServiceAccessApi("student-follow-up")',
    methods: ["POST", "PATCH"],
  },
  {
    path: "app/api/dashboard/family-school-communication/route.ts",
    guard: 'requireServiceAccessApi("family-school-communication")',
    methods: ["POST", "PATCH"],
  },
  {
    path: "app/api/dashboard/committees-meetings/route.ts",
    guard: 'requireServiceAccessApi("committees-meetings")',
    methods: ["POST", "PATCH"],
  },
  {
    path: "app/api/dashboard/guidance-programs/route.ts",
    guard: 'requireServiceAccessApi("guidance-programs")',
    methods: ["POST", "PATCH"],
  },
  {
    path: "app/api/dashboard/results-analysis/route.ts",
    guard: 'requireServiceAccessApi("results-analysis")',
    methods: ["POST", "PATCH"],
  },
  {
    path: "app/api/dashboard/cases/route.ts",
    guard: "requireActiveSubscriptionApi()",
    methods: ["POST", "PATCH"],
  },
  {
    path: "app/api/dashboard/reports/route.ts",
    guard: "requireActiveSubscriptionApi()",
    methods: ["POST", "PATCH"],
  },
  {
    path: "app/api/dashboard/reports/[reportId]/evidence/route.ts",
    guard: "requireActiveSubscriptionApi()",
    methods: ["POST", "PATCH", "DELETE"],
  },
];

const importLine =
  'import { requireActiveSubscriptionApi, requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";\n';

function ensureImport(content) {
  if (content.includes("@/lib/subscription/subscription-api-guard")) {
    return content;
  }

  const importMatches = content.match(/^import .+;$/gm);

  if (!importMatches || importMatches.length === 0) {
    return importLine + content;
  }

  const lastImport = importMatches[importMatches.length - 1];
  return content.replace(lastImport, `${lastImport}\n${importLine.trimEnd()}`);
}

function patchMethod(content, method, guardCall) {
  const marker = `subscription-api-guard:${method}:${guardCall}`;

  if (content.includes(marker)) {
    return content;
  }

  const regex = new RegExp(
    `(export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*{)`,
    "m"
  );

  if (!regex.test(content)) {
    return content;
  }

  return content.replace(
    regex,
    `$1
  // ${marker}
  const subscriptionGuard = await ${guardCall};
  if (subscriptionGuard) return subscriptionGuard;
`
  );
}

for (const target of targets) {
  if (!fs.existsSync(target.path)) {
    console.log(`تجاوز: ${target.path} غير موجود.`);
    continue;
  }

  let content = fs.readFileSync(target.path, "utf8");
  const original = content;

  content = ensureImport(content);

  for (const method of target.methods) {
    content = patchMethod(content, method, target.guard);
  }

  if (content !== original) {
    fs.writeFileSync(target.path, content, "utf8");
    console.log(`تمت حماية: ${target.path}`);
  } else {
    console.log(`لا تغيير: ${target.path}`);
  }
}

console.log("انتهى تطبيق حماية الاشتراكات على APIs الحساسة.");
