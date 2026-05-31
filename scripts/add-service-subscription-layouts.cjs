const fs = require("fs");
const path = require("path");

const services = [
  { dir: "app/dashboard/student-follow-up", slug: "student-follow-up" },
  { dir: "app/dashboard/family-school-communication", slug: "family-school-communication" },
  { dir: "app/dashboard/committees-meetings", slug: "committees-meetings" },
  { dir: "app/dashboard/guidance-programs", slug: "guidance-programs" },
  { dir: "app/dashboard/student-guidance-services", slug: "student-guidance-services" },
  { dir: "app/dashboard/results-analysis", slug: "results-analysis" },
  { dir: "app/dashboard/comprehensive-reference", slug: "comprehensive-reference" }
];

for (const service of services) {
  fs.mkdirSync(service.dir, { recursive: true });

  const layoutPath = path.join(service.dir, "layout.tsx");

  if (fs.existsSync(layoutPath)) {
    console.log(`تم تجاوز ${layoutPath} لأنه موجود مسبقًا.`);
    continue;
  }

  const content = `import type { ReactNode } from "react";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function ServiceAccessLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireServiceAccessForCurrentUser("${service.slug}");

  return <>{children}</>;
}
`;

  fs.writeFileSync(layoutPath, content, "utf8");
  console.log(`تم إنشاء ${layoutPath}`);
}

/*
  حماية إنشاء التقارير الجديدة إن وجد مسار له.
*/
const reportNewDir = "app/dashboard/reports/new";
fs.mkdirSync(reportNewDir, { recursive: true });

const reportLayoutPath = path.join(reportNewDir, "layout.tsx");
if (!fs.existsSync(reportLayoutPath)) {
  fs.writeFileSync(
    reportLayoutPath,
`import type { ReactNode } from "react";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function ReportCreationLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireActiveSubscriptionForCurrentUser();

  return <>{children}</>;
}
`,
    "utf8"
  );
  console.log(`تم إنشاء ${reportLayoutPath}`);
}
