const fs = require("fs");

const filePath = "components/cases/case-details-view.tsx";

let text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

const oldFunction = `function displayCaseValue(
  value: WorkflowValueLike | null,
  workflowValues: WorkflowValueLike[],
) {
  if (!value) return "غير محدد";

  const display = formatWorkflowDisplayValue(value, workflowValues);

  if (display === null || display === undefined || display === "") {
    return "غير محدد";
  }

  if (
    typeof display === "string" ||
    typeof display === "number" ||
    typeof display === "boolean"
  ) {
    return String(display);
  }

  if (Array.isArray(display)) {
    return display
      .map((item) =>
        typeof item === "string" || typeof item === "number"
          ? String(item)
          : "",
      )
      .filter(Boolean)
      .join("، ") || "غير محدد";
  }

  return "بيانات محفوظة";
}`;

const newFunction = `function displayCaseValue(
  value: WorkflowValueLike | null,
  workflowValues: WorkflowValueLike[],
) {
  if (!value) return "غير محدد";

  const display: unknown = formatWorkflowDisplayValue(value, workflowValues);

  if (display === null || display === undefined || display === "") {
    return "غير محدد";
  }

  if (
    typeof display === "string" ||
    typeof display === "number" ||
    typeof display === "boolean"
  ) {
    return String(display);
  }

  if (Array.isArray(display)) {
    const text = display
      .map((item: unknown) =>
        typeof item === "string" || typeof item === "number"
          ? String(item)
          : "",
      )
      .filter(Boolean)
      .join("، ");

    return text || "غير محدد";
  }

  return "بيانات محفوظة";
}`;

if (!text.includes(oldFunction)) {
  throw new Error("لم أجد دالة displayCaseValue بالشكل المتوقع داخل case-details-view.tsx");
}

text = text.replace(oldFunction, newFunction);

fs.writeFileSync(filePath, text, "utf8");

console.log("تم إصلاح TypeScript في displayCaseValue.");
