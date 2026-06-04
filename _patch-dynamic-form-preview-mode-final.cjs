const fs = require("fs");

const path = "components\\workflow\\dynamic-form-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("previewMode?: boolean;")) {
  content = content.replace(
    /initialEvidenceItems\?: EvidenceItem\[\];\s*};/,
    `initialEvidenceItems?: EvidenceItem[];
  previewMode?: boolean;
};`
  );
}

if (!content.includes("previewMode = false")) {
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

if (!content.includes("if (previewMode) return true;")) {
  content = content.replace(
    `  function validateStudentSelection() {
    if (!needsStudent) return true;`,
    `  function validateStudentSelection() {
    if (previewMode) return true;
    if (!needsStudent) return true;`
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

fs.writeFileSync(path, content, "utf8");
console.log("DynamicFormRenderer previewMode is safe for inline workflow preview.");
