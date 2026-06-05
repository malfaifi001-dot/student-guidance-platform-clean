const fs = require("fs");

const filePath = "app/dashboard/admin/workflows/page.tsx";

let text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

const before = text;

// حذف import Sparkles إذا صار غير مستخدم
text = text.replace(/\n\s*Sparkles,/g, "");

// حذف زر "آلية الاعتماد" من الهيدر
text = text.replace(
  /\n\s*<a\s+href="#workflow-process"[\s\S]*?<\/a>/,
  ""
);

// حذف سكشن رحلة اعتماد Workflow كاملًا
text = text.replace(
  /\n\s*<section\s+id="workflow-process"[\s\S]*?\n\s*<\/section>\n(?=\s*<section\s+id="workflow-services")/,
  "\n"
);

// حذف دالة WorkflowProcessStep إذا لم تعد مستخدمة
text = text.replace(
  /\nfunction WorkflowProcessStep\(\{[\s\S]*?\n\}\n(?=\nfunction SmallWorkflowStat)/,
  "\n"
);

if (text === before) {
  console.log("لم يتم العثور على القسم أو أنه محذوف مسبقًا.");
} else {
  fs.writeFileSync(filePath, text, "utf8");
  console.log("تم حذف قسم رحلة اعتماد Workflow بنجاح.");
}
