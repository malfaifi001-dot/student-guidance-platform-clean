const fs = require("fs");

const path = "components\\report-engine\\report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

function isInsideReportDesignTemplatesMap(index) {
  const before = content.slice(0, index);
  const lastReportDesignMap = before.lastIndexOf("reportDesignTemplates.map((design)");
  const lastThemeOptionsMap = before.lastIndexOf("designThemeOptions.map((theme)");
  const lastAnyThemeMap = Math.max(lastThemeOptionsMap, before.lastIndexOf("designThemeOptions.map((design)"));

  return (
    lastReportDesignMap !== -1 &&
    lastReportDesignMap > lastAnyThemeMap &&
    index - lastReportDesignMap < 5000
  );
}

function replaceUnsafeDesignClassReferences() {
  const pattern = /active\s*\?\s*design\.activeCardClass\s*:\s*design\.cardClass,/g;
  let output = "";
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    output += content.slice(lastIndex, match.index);

    if (isInsideReportDesignTemplatesMap(match.index)) {
      output += match[0];
    } else {
      output += `active
                        ? "border-emerald-600 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:bg-white",`;
    }

    lastIndex = pattern.lastIndex;
  }

  output += content.slice(lastIndex);
  content = output;
}

function replaceUnsafeDesignBadgeReferences() {
  const pattern = /\{design\.badge\}/g;
  let output = "";
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    output += content.slice(lastIndex, match.index);

    if (isInsideReportDesignTemplatesMap(match.index)) {
      output += match[0];
    } else {
      output += "تصميم";
    }

    lastIndex = pattern.lastIndex;
  }

  output += content.slice(lastIndex);
  content = output;
}

replaceUnsafeDesignClassReferences();
replaceUnsafeDesignBadgeReferences();

fs.writeFileSync(path, content, "utf8");
console.log("Fixed unsafe design variable references outside the real design gallery.");
