const fs = require("fs");

const path = "app/dashboard/guidance-programs/new/page.tsx";

if (!fs.existsSync(path)) {
  throw new Error("لم يتم العثور على app/dashboard/guidance-programs/new/page.tsx");
}

let content = fs.readFileSync(path, "utf8");

if (!content.includes("studentPickerMode: workflow.studentPickerMode")) {
  const pattern = /const runtimeWorkflow = sortRuntimeWorkflow\(\{([\s\S]*?)\n\}\);/;

  if (!pattern.test(content)) {
    throw new Error("لم أستطع تعديل runtimeWorkflow تلقائيًا. أرسل محتوى الملف كاملًا.");
  }

  content = content.replace(
    pattern,
    `const runtimeWorkflow = {
  ...sortRuntimeWorkflow({$1
  }),
  studentPickerMode: workflow.studentPickerMode || "SERVICE_DEFAULT",
};`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تم تمرير studentPickerMode فعليًا إلى صفحة الموجه للبرامج الإرشادية.");
