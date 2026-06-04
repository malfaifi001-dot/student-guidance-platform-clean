const fs = require("fs");

const path = "components\\workflow\\dynamic-form-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("previewMode?: boolean;")) {
  content = content.replace(
    "initialEvidenceItems?: EvidenceItem[];",
    "initialEvidenceItems?: EvidenceItem[];\n  previewMode?: boolean;"
  );
}

if (!content.includes("previewMode = false,")) {
  content = content.replace(
`  initialValues,
  initialEvidenceItems,
}: Props) {`,
`  initialValues,
  initialEvidenceItems,
  previewMode = false,
}: Props) {`
  );
}

if (!content.includes("هذه معاينة فقط ولا يتم حفظ حالة فعلية.")) {
  content = content.replace(
`  async function handleSave(type: "draft" | "submit") {
    if (!validateStudentSelection()) return;`,
`  async function handleSave(type: "draft" | "submit") {
    if (previewMode) {
      showFeedback(
        "info",
        "وضع المعاينة",
        "هذه معاينة فقط ولا يتم حفظ حالة فعلية."
      );

      return;
    }

    if (!validateStudentSelection()) return;`
  );
}

content = content.replace(
  "نموذج ديناميكي مبني على Workflow منشور. الحقول والخيارات والتبعيات\n          تظهر حسب إعدادات الخدمة والبيانات المرفوعة من لوحة الأدمن.",
  "{previewMode ? \"معاينة أدمن لا تحفظ أي بيانات.\" : \"نموذج ديناميكي مبني على Workflow منشور. الحقول والخيارات والتبعيات تظهر حسب إعدادات الخدمة والبيانات المرفوعة من لوحة الأدمن.\"}"
);

content = content.replace(
  "حفظ مسودة",
  "{previewMode ? \"معاينة فقط\" : \"حفظ مسودة\"}"
);

content = content.replace(
  '{loading ? "جاري الحفظ..." : caseId ? "تحديث الحالة" : "إرسال"}',
  '{previewMode ? "لا يتم الحفظ في المعاينة" : loading ? "جاري الحفظ..." : caseId ? "تحديث الحالة" : "إرسال"}'
);

fs.writeFileSync(path, content, "utf8");

console.log("DynamicFormRenderer previewMode applied.");
