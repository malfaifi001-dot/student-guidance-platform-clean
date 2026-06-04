const fs = require("fs");

const path = "app\\dashboard\\reports\\[reportId]\\preview\\page.tsx";
const content = fs.readFileSync(path, "utf8");

const lines = content.split(/\r?\n/);
const importLine =
  'import { FinalReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";';

let seen = false;

const cleaned = lines.filter((line) => {
  if (line.trim() !== importLine) {
    return true;
  }

  if (!seen) {
    seen = true;
    return true;
  }

  return false;
});

fs.writeFileSync(path, cleaned.join("\n"), "utf8");

console.log("Duplicate FinalReportDesignRenderer import removed.");
