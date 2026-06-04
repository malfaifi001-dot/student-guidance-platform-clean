const fs = require("fs");

const pagePath = "app/dashboard/admin/workflows/[serviceSlug]/page.tsx";

if (!fs.existsSync(pagePath)) {
  throw new Error("لم يتم العثور على صفحة Workflow.");
}

let content = fs.readFileSync(pagePath, "utf8");

if (!content.includes("workflow-student-picker-mode-control")) {
  content = content.replace(
    `import { WorkflowPublishPanel } from "@/components/admin/workflows/workflow-publish-panel";`,
    `import { WorkflowPublishPanel } from "@/components/admin/workflows/workflow-publish-panel";
import { WorkflowStudentPickerModeControl } from "@/components/admin/workflows/workflow-student-picker-mode-control";`
  );
}

if (!content.includes("<WorkflowStudentPickerModeControl")) {
  const anchor = `                </div>

                {(workflow._count?.cases || 0) > 0 ? (`;

  const replacement = `                </div>

                <WorkflowStudentPickerModeControl
                  serviceSlug={serviceSlug}
                  workflowId={workflow.id}
                  workflowName={workflow.name}
                  initialMode={workflow.studentPickerMode || "SERVICE_DEFAULT"}
                  disabled={workflow.status === "ARCHIVED"}
                  isActive={workflow.isActive}
                />

                {(workflow._count?.cases || 0) > 0 ? (`;

  if (!content.includes(anchor)) {
    throw new Error("لم يتم العثور على مكان الإضافة بعد كروت الإحصائيات.");
  }

  content = content.replace(anchor, replacement);
}

fs.writeFileSync(pagePath, content, "utf8");

console.log("تم حقن اختيار الطالب الذكي داخل كروت Workflow بنجاح.");
