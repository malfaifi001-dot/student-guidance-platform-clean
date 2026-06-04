const fs = require("fs");

const path = "components\\report-engine\\design-renderers\\report-design-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

const start = content.indexOf("function renderText(");

if (start === -1) {
  throw new Error("لم أجد function renderText");
}

const nextMarkers = [
  "function splitLines(",
  "function splitParagraphs(",
  "function normalizeDesignId(",
];

const end = nextMarkers
  .map((marker) => content.indexOf(marker, start + 1))
  .filter((index) => index !== -1)
  .sort((a, b) => a - b)[0];

if (!end) {
  throw new Error("لم أجد الدالة التي تأتي بعد renderText");
}

const fixedRenderText = String.raw`function renderText(text: string, context: Record<string, string>) {
  const source = String(text || "");

  const replaceVariable = (_match: string, key: string) => {
    const cleanKey = String(key || "").trim();

    if (!cleanKey) {
      return "";
    }

    return resolveContextVariable(cleanKey, context);
  };

  return source
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, replaceVariable)
    .replace(/\{([A-Za-z0-9_.\-\u0600-\u06FF ]+)\}/g, replaceVariable);
}

`;

content = content.slice(0, start) + fixedRenderText + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("renderText corruption fixed.");
