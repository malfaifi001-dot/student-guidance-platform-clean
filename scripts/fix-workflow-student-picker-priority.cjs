const fs = require("fs");

const path = "components/workflow/dynamic-form-renderer.tsx";

if (!fs.existsSync(path)) {
  throw new Error("لم يتم العثور على components/workflow/dynamic-form-renderer.tsx");
}

let content = fs.readFileSync(path, "utf8");

const newBlock = `const workflowStudentPickerMode =
    typeof (workflow as any).studentPickerMode === "string"
      ? (workflow as any).studentPickerMode
      : "SERVICE_DEFAULT";

  const workflowStudentPickerDecision =
    workflowStudentPickerMode === "REQUIRED"
      ? true
      : workflowStudentPickerMode === "DISABLED"
        ? false
        : undefined;

  const needsStudent =
    workflowStudentPickerDecision ??
    requiresStudent ??
    SERVICES_REQUIRING_STUDENT.has(workflow.serviceSlug);

  // WORKFLOW_STUDENT_PICKER_MODE_RUNTIME_MARKER`;

if (content.includes("WORKFLOW_STUDENT_PICKER_MODE_RUNTIME_MARKER")) {
  content = content.replace(
    /const workflowStudentPickerMode[\s\S]*?\/\/ WORKFLOW_STUDENT_PICKER_MODE_RUNTIME_MARKER/,
    newBlock
  );
} else {
  content = content.replace(
    /const needsStudent\s*=\s*requiresStudent\s*\?\?\s*SERVICES_REQUIRING_STUDENT\.has\(workflow\.serviceSlug\);/,
    newBlock
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تم تعديل أولوية Smart Picker: إعداد Workflow صار أعلى من requiresStudent.");
