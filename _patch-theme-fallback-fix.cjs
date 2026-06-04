const fs = require("fs");

const path = "components\\report-engine\\report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

if (
  content.includes("function getDesignThemePalette") &&
  !content.includes('const theme = getDesignThemePalette("MINISTRY_CLASSIC");')
) {
  content = content.replace(
    "function getServiceName",
    'const theme = getDesignThemePalette("MINISTRY_CLASSIC");\n\nfunction getServiceName'
  );
}

fs.writeFileSync(path, content, "utf8");
console.log("Theme fallback fixed.");
