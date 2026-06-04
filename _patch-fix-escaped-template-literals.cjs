const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

// Fix escaped template literals accidentally written into TypeScript source.
content = content.replaceAll("\\`", "`");
content = content.replaceAll("\\${", "${");

fs.writeFileSync(path, content, "utf8");

console.log("Escaped template literals fixed.");
