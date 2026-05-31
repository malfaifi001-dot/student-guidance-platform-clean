const fs = require("fs");

const targets = [
  {
    path: "app/api/dashboard/cases/save-draft/route.ts",
    status: "DRAFT",
    marker: "audit-log:case-draft-saved",
  },
  {
    path: "app/api/dashboard/cases/submit/route.ts",
    status: "SUBMITTED",
    marker: "audit-log:case-submitted",
  },
];

function addImport(content) {
  const line = 'import { logCaseSavedEvent } from "@/lib/admin/activity-events";';
  if (content.includes(line)) return content;

  const imports = content.match(/^import .+;$/gm);
  if (!imports?.length) return `${line}\n${content}`;

  const lastImport = imports[imports.length - 1];
  return content.replace(lastImport, `${lastImport}\n${line}`);
}

for (const target of targets) {
  if (!fs.existsSync(target.path)) {
    console.log(`تجاوز: ${target.path}`);
    continue;
  }

  let content = fs.readFileSync(target.path, "utf8");

  if (content.includes(target.marker)) {
    console.log(`موجود مسبقًا: ${target.path}`);
    continue;
  }

  content = addImport(content);

  const logBlock = `
    // ${target.marker}
    await logCaseSavedEvent({
      caseId: result.id,
      status: "${target.status}",
      title: body.title || null,
      workflowId: body.workflowId || null,
      serviceId: body.serviceId || null,
      studentId: body.studentId || null,
      valueCount:
        body.values && typeof body.values === "object"
          ? Object.keys(body.values).length
          : 0,
      evidenceCount: Array.isArray(body.evidenceItems)
        ? body.evidenceItems.length
        : 0,
    });
`;

  content = content.replace(
    /const\s+result\s*=\s*await\s+saveRuntimeCase\([\s\S]*?\);\s*/m,
    (match) => `${match}${logBlock}\n`
  );

  fs.writeFileSync(target.path, content, "utf8");
  console.log(`تم ربط سجل الحالة: ${target.path}`);
}
