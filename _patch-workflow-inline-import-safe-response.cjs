const fs = require("fs");

const path = "components\\admin\\workflows\\workflow-inline-import-workbench.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("async function readWorkflowApiResponse")) {
  content = content.replace(
    "export function WorkflowInlineImportWorkbench({",
    `async function readWorkflowApiResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error:
        text.length > 300
          ? text.slice(0, 300)
          : text,
    };
  }
}

export function WorkflowInlineImportWorkbench({`
  );
}

content = content.replace(
  "      const data = await response.json();",
  "      const data = await readWorkflowApiResponse(response);"
);

content = content.replace(
  '        throw new Error(data.error || "تعذر إنشاء مسودة Workflow.");',
  '        throw new Error(data.error || `تعذر إنشاء مسودة Workflow. HTTP ${response.status}`);'
);

fs.writeFileSync(path, content, "utf8");

console.log("Workflow inline import now safely reads API responses.");
