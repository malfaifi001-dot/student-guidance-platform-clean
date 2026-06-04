const fs = require("fs");

const path = "app/dashboard/guidance-programs/new/page.tsx";

if (!fs.existsSync(path)) {
  throw new Error("لم يتم العثور على app/dashboard/guidance-programs/new/page.tsx");
}

let content = fs.readFileSync(path, "utf8");

let changed = false;

if (!content.includes("studentPickerMode: workflow.studentPickerMode")) {
  const patterns = [
    {
      from: `workflowType: workflow.workflowType,
`,
      to: `workflowType: workflow.workflowType,
    studentPickerMode: workflow.studentPickerMode || "SERVICE_DEFAULT",
`,
    },
    {
      from: `workflowType: activeWorkflow.workflowType,
`,
      to: `workflowType: activeWorkflow.workflowType,
    studentPickerMode: activeWorkflow.studentPickerMode || "SERVICE_DEFAULT",
`,
    },
    {
      from: `serviceSlug: workflow.service.slug,
`,
      to: `serviceSlug: workflow.service.slug,
    studentPickerMode: workflow.studentPickerMode || "SERVICE_DEFAULT",
`,
    },
    {
      from: `serviceSlug: service.slug,
`,
      to: `serviceSlug: service.slug,
    studentPickerMode: workflow.studentPickerMode || "SERVICE_DEFAULT",
`,
    },
  ];

  for (const pattern of patterns) {
    if (content.includes(pattern.from)) {
      content = content.replace(pattern.from, pattern.to);
      changed = true;
      break;
    }
  }
}

if (!changed && !content.includes("studentPickerMode:")) {
  throw new Error("لم أجد مكان إدراج studentPickerMode داخل runtimeWorkflow. أرسل محتوى app/dashboard/guidance-programs/new/page.tsx.");
}

fs.writeFileSync(path, content, "utf8");

console.log("تم تمرير studentPickerMode إلى صفحة الموجه للبرامج الإرشادية.");
