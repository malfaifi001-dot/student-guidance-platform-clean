const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

function findMatchingDetailsEnd(source, start) {
  const regex = /<\/?details\b/g;
  regex.lastIndex = start;

  let depth = 0;
  let match;

  while ((match = regex.exec(source))) {
    if (match[0].startsWith("</")) {
      depth -= 1;

      if (depth === 0) {
        const end = source.indexOf(">", match.index);
        if (end === -1) throw new Error("لم أجد نهاية details.");
        return end + 1;
      }
    } else {
      depth += 1;
    }
  }

  throw new Error("لم أجد نهاية محرر النصوص.");
}

/* تصغير عمود محرر النصوص */
content = content.replace(
  'xl:grid-cols-[480px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]',
  'xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[460px_minmax(0,1fr)]'
);

/* تصغير كرت محرر النصوص نفسه فقط */
const marker = "REPORT_STUDIO_SIDE_TEXT_EDITOR";
const markerIndex = content.indexOf(marker);

if (markerIndex === -1) {
  throw new Error("لم أجد محرر النصوص الجانبي.");
}

const detailsStart = content.indexOf("<details", markerIndex);

if (detailsStart === -1) {
  throw new Error("لم أجد بداية محرر النصوص.");
}

const detailsEnd = findMatchingDetailsEnd(content, detailsStart);

let editorBlock = content.slice(detailsStart, detailsEnd);

editorBlock = editorBlock
  .replace(
    'className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm"',
    'className="rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm"'
  )
  .replace(
    'rounded-2xl bg-slate-50 px-4 py-3',
    'rounded-2xl bg-slate-50 px-3 py-3'
  )
  .replaceAll("text-lg font-black", "text-base font-black")
  .replaceAll("mt-4 space-y-4", "mt-3 space-y-3")
  .replaceAll("rounded-3xl border border-slate-200 bg-slate-50 p-4", "rounded-2xl border border-slate-200 bg-slate-50 p-3")
  .replaceAll("rows={10}", "rows={7}")
  .replaceAll("leading-8", "leading-7")
  .replaceAll("px-4 py-3", "px-3 py-2.5");

content = content.slice(0, detailsStart) + editorBlock + content.slice(detailsEnd);

fs.writeFileSync(path, content, "utf8");

console.log("Text editor dimensions compacted.");
