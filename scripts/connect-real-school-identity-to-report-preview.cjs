const fs = require("fs");

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(previewPath, "utf8");

if (!content.includes('buildReportIdentityFromCurrentUser')) {
  content = content.replace(
    /import /,
    'import { getCurrentSessionUser } from "@/lib/auth/current-user";\nimport { buildReportIdentityFromCurrentUser } from "@/lib/report-engine/report-identity-runtime";\nimport '
  );
}

if (!content.includes("const currentSession = await getCurrentSessionUser();")) {
  content = content.replace(
`  const resolvedSearchParams = searchParams ? await searchParams : {};`,
`  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentSession = await getCurrentSessionUser();
  const runtimeReportIdentity = buildReportIdentityFromCurrentUser(
    currentSession?.user ?? null
  );`
  );
}

content = content.replace(
  /<ReportBuilderPdfRenderer([\s\S]*?)\/>/g,
  (match) => {
    if (match.includes("identity={")) {
      return match.replace(
        /identity=\{[^}]+\}/,
        "identity={runtimeReportIdentity}"
      );
    }

    return match.replace(
      /previewCaseData=/,
      "identity={runtimeReportIdentity}\n            previewCaseData="
    );
  }
);

fs.writeFileSync(previewPath, content, "utf8");

console.log("تم ربط ReportBuilderPdfRenderer بهوية المدرسة الحقيقية.");
