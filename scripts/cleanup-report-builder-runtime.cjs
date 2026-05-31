const fs = require("fs");

function removeBuilderHelpers(content, label) {
  const before = content;

  content = content.replace(
    /function getBuilderTemplateFromSnapshot\(snapshot: unknown\) \{[\s\S]*?\n\}\s*\n\s*export default async function/,
    "export default async function"
  );

  if (content === before && before.includes("function getBuilderTemplateFromSnapshot")) {
    throw new Error(`فشل حذف دوال Builder المكررة من ${label}`);
  }

  return content;
}

function ensureImport(content, importLine) {
  if (content.includes(importLine)) {
    return content;
  }

  const lastImportMatch = [...content.matchAll(/^import .*?;\s*$/gm)].pop();

  if (!lastImportMatch) {
    throw new Error("لم أجد مكان imports");
  }

  const insertAt = lastImportMatch.index + lastImportMatch[0].length;

  return `${content.slice(0, insertAt)}\n${importLine}${content.slice(insertAt)}`;
}

/* =========================
   1) Clean preview page
========================= */

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

preview = ensureImport(
  preview,
  `import {
  buildBuilderPreviewCaseData,
  resolveBuilderTemplateForReport,
} from "@/lib/report-engine/report-builder-template-runtime";`
);

preview = removeBuilderHelpers(preview, "preview/page.tsx");

preview = preview.replace(
  /const builderTemplate =\s*getBuilderTemplateFromSnapshot\(report\.templateSnapshot\) \|\|\s*\(await getBuilderTemplateFromDatabase\(\s*resolvedSearchParams\.template \|\| report\.templateId\s*\)\);/m,
  `const builderTemplate = await resolveBuilderTemplateForReport(report, {
    templateIdOverride: resolvedSearchParams.template || report.templateId,
  });`
);

fs.writeFileSync(previewPath, preview, "utf8");

/* =========================
   2) Clean studio page
========================= */

const studioPath = "app/dashboard/reports/[reportId]/studio/page.tsx";
let studio = fs.readFileSync(studioPath, "utf8");

studio = ensureImport(
  studio,
  `import {
  buildBuilderPreviewCaseData,
  resolveBuilderTemplateForReport,
} from "@/lib/report-engine/report-builder-template-runtime";`
);

studio = removeBuilderHelpers(studio, "studio/page.tsx");

studio = studio.replace(
  /const builderTemplate =\s*getBuilderTemplateFromSnapshot\(report\.templateSnapshot\) \|\|\s*\(await getBuilderTemplateFromDatabase\(report\.templateId\)\);/m,
  `const builderTemplate = await resolveBuilderTemplateForReport(report);`
);

studio = studio.replace(
  /buildBuilderStudioPreviewCaseData\(/g,
  "buildBuilderPreviewCaseData("
);

fs.writeFileSync(studioPath, studio, "utf8");

console.log("تم تنظيف دوال Builder ونقلها إلى runtime مركزي.");
