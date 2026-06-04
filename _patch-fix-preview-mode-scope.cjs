const fs = require("fs");

const path = "components\\workflow\\dynamic-form-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  Fix:
  previewMode is used in the component body, but it was not guaranteed
  to exist in Props or in the function destructuring.
*/

// 1) Add previewMode to Props if missing.
if (!content.includes("previewMode?: boolean;")) {
  const before = content;

  content = content.replace(
    /initialEvidenceItems\?: EvidenceItem\[\];\s*};/,
    `initialEvidenceItems?: EvidenceItem[];
  previewMode?: boolean;
};`
  );

  if (content === before) {
    throw new Error("لم أستطع إضافة previewMode إلى Props.");
  }
}

// 2) Add previewMode = false to DynamicFormRenderer destructuring if missing.
if (!content.includes("previewMode = false")) {
  const before = content;

  content = content.replace(
    /export function DynamicFormRenderer\(\{([\s\S]*?)initialEvidenceItems,\s*\}: Props\) \{/,
    `export function DynamicFormRenderer({$1initialEvidenceItems,
  previewMode = false,
}: Props) {`
  );

  if (content === before) {
    throw new Error("لم أستطع إضافة previewMode داخل DynamicFormRenderer.");
  }
}

// 3) Safety: if previewMode exists in Props but not destructuring, patch a common formatting shape.
if (!content.includes("previewMode = false")) {
  const before = content;

  content = content.replace(
    `  initialValues,
  initialEvidenceItems,
}: Props) {`,
    `  initialValues,
  initialEvidenceItems,
  previewMode = false,
}: Props) {`
  );

  if (content === before) {
    throw new Error("فشل التصحيح الاحتياطي لإضافة previewMode.");
  }
}

fs.writeFileSync(path, content, "utf8");

console.log("Fixed DynamicFormRenderer previewMode Props and destructuring.");
