const fs = require("fs");

const path = "components/report-engine/report-builder-pdf-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

function findFunctionEnd(source, startIndex) {
  const openBrace = source.indexOf("{", startIndex);
  if (openBrace === -1) return -1;

  let depth = 0;

  for (let i = openBrace; i < source.length; i++) {
    const char = source[i];

    if (char === "{") depth++;
    if (char === "}") depth--;

    if (depth === 0) {
      return i + 1;
    }
  }

  return -1;
}

const functionName = "function getEditorialSectionsForPage";
const matches = [];

let searchFrom = 0;

while (true) {
  const index = content.indexOf(functionName, searchFrom);

  if (index === -1) break;

  const end = findFunctionEnd(content, index);

  if (end === -1) {
    throw new Error("لم أستطع تحديد نهاية الدالة getEditorialSectionsForPage.");
  }

  matches.push({ start: index, end });
  searchFrom = end;
}

if (matches.length <= 1) {
  console.log("لا توجد دوال مكررة. العدد:", matches.length);
} else {
  // نحذف من آخر نسخة إلى الثانية، ونبقي أول نسخة فقط
  for (let i = matches.length - 1; i >= 1; i--) {
    content =
      content.slice(0, matches[i].start).trimEnd() +
      "\n\n" +
      content.slice(matches[i].end).trimStart();
  }

  fs.writeFileSync(path, content, "utf8");

  console.log(`تم حذف ${matches.length - 1} نسخة مكررة من getEditorialSectionsForPage.`);
}
