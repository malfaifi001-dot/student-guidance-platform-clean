const fs = require("fs");

const path = "app/dashboard/admin/workflows/[serviceSlug]/preview/page.tsx";

if (!fs.existsSync(path)) {
  throw new Error("لم يتم العثور على صفحة معاينة Workflow.");
}

let content = fs.readFileSync(path, "utf8");

if (!content.includes("studentPickerMode: workflow.studentPickerMode")) {
  content = content.replace(
    `    workflowType: workflow.workflowType,
    steps: workflow.steps.map((step) => ({`,
    `    workflowType: workflow.workflowType,
    studentPickerMode: workflow.studentPickerMode || "SERVICE_DEFAULT",
    steps: workflow.steps.map((step) => ({`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تم تمرير studentPickerMode إلى DynamicFormRenderer في صفحة المعاينة.");
