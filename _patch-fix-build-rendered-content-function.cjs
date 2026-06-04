const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

const start = content.indexOf("function buildRenderedContentFromPages");

if (start === -1) {
  throw new Error("لم أجد function buildRenderedContentFromPages");
}

const end = content.indexOf("function buildLivePreviewPage", start);

if (end === -1) {
  throw new Error("لم أجد function buildLivePreviewPage بعد buildRenderedContentFromPages");
}

const fixedFunction = `function buildRenderedContentFromPages({
  pages,
  blocks,
  context,
}: {
  pages: TemplatePage[];
  blocks: Record<string, string>;
  context: Record<string, string>;
}) {
  return pages
    .map((page) => {
      const blockText = page.blocks
        .map((block, index) => {
          const blockKey = getBlockKey(page, block, index);
          const value = blocks[blockKey]?.trim();

          if (!value || isLegacyRenderedReportDump(value)) {
            return "";
          }

          return \`\${page.title} - \${getBlockTitle(block)}\\n\${renderText(
            value,
            context,
          )}\`;
        })
        .filter(Boolean)
        .join("\\n\\n");

      return blockText;
    })
    .filter(Boolean)
    .join("\\n\\n");
}

`;

content = content.slice(0, start) + fixedFunction + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("buildRenderedContentFromPages fixed.");
