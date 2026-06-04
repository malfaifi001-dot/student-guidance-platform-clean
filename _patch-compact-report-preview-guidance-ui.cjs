const fs = require("fs");

const path = "app\\dashboard\\reports\\[reportId]\\preview\\page.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  Remove the separate back-to-reports pill above the guidance card.
  The new guidance card already includes a clear "التقارير" action.
*/
const backBlockRegex = /\s*\{!studioMode \? \(\s*<div className="no-print mx-auto mb-3 flex max-w-\[210mm\] justify-start">[\s\S]*?<\/div>\s*\) : null\}\s*/;

if (backBlockRegex.test(content)) {
  content = content.replace(backBlockRegex, "\n");
} else {
  console.log("Extra back link was not found or already removed.");
}

fs.writeFileSync(path, content, "utf8");

console.log("Preview guidance UI compacted and extra back link removed.");
