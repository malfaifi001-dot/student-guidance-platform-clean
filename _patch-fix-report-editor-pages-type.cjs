const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

/* Ensure pages has an explicit TemplatePage[] type */
content = content.replace(
  "  const pages = template.pages;",
  "  const pages = template.pages as TemplatePage[];"
);

/* Extra safety: type activePage find callback */
content = content.replace(
  "    pages.find((page) => page.id === activePageId) || pages[0];",
  "    pages.find((page: TemplatePage) => page.id === activePageId) || pages[0];"
);

fs.writeFileSync(path, content, "utf8");

console.log("Pages type fixed in report studio editor.");
