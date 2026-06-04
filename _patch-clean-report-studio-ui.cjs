const fs = require("fs");

const studioPagePath = "app\\dashboard\\reports\\[reportId]\\studio\\page.tsx";
const editorPath = "components\\reports\\report-studio-editor.tsx";

let studioPage = fs.readFileSync(studioPagePath, "utf8");
let editor = fs.readFileSync(editorPath, "utf8");

/* =========================================================
   1) Remove big blue page header from /studio and pull content up
========================================================= */

studioPage = studioPage.replace(
  '<main className="space-y-6" dir="rtl">',
  '<main className="space-y-0" dir="rtl">'
);

const headerRegex =
  /\s*<section className="rounded-\[2rem\] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl">[\s\S]*?<\/section>\s*(?=<ReportStudioEditor report=\{normalizedReport\} \/>)/;

if (headerRegex.test(studioPage)) {
  studioPage = studioPage.replace(headerRegex, "\n      ");
} else {
  console.log("Main blue studio header was not found or already removed.");
}

/* =========================================================
   2) Remove duplicated pages card from side panel
   Page tabs already exist above the live preview.
========================================================= */

const pagesTitle = "صفحات التقرير";
const pagesTitleIndex = editor.indexOf(pagesTitle);

if (pagesTitleIndex !== -1) {
  const sectionStart = editor.lastIndexOf(
    '<section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
    pagesTitleIndex
  );

  const nextSection = editor.indexOf(
    '\n\n            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
    pagesTitleIndex
  );

  if (sectionStart !== -1 && nextSection !== -1) {
    editor = editor.slice(0, sectionStart) + editor.slice(nextSection + 2);
  } else {
    console.log("Could not safely remove duplicated pages card.");
  }
} else {
  console.log("Duplicated pages card is already removed.");
}

/* =========================================================
   3) Keep text editor collapsible but open by default
========================================================= */

editor = editor.replace(
  '<details className="order-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
  '<details open className="order-2 rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">'
);

editor = editor.replace(
  "مغلق افتراضيًا لتبسيط الصفحة. افتحه فقط إذا أردت تعديل نصوص بلوكات هذه الصفحة.",
  "مفتوح لأنه أهم جزء في التعديل. يمكنك إغلاقه إذا أردت التركيز على المعاينة فقط."
);

/* =========================================================
   4) Tighten spacing and side panel width a little
========================================================= */

editor = editor.replace(
  '        <div className="grid gap-6 p-6 xl:grid-cols-[390px_1fr]">',
  '        <div className="grid gap-5 p-5 xl:grid-cols-[340px_1fr]">'
);

editor = editor.replace(
  '<aside className="space-y-4">',
  '<aside className="space-y-3">'
);

/* Make preview panel visually connected to the top */
editor = editor.replace(
  '<section className="order-first rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
  '<section className="order-first rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">'
);

fs.writeFileSync(studioPagePath, studioPage, "utf8");
fs.writeFileSync(editorPath, editor, "utf8");

console.log("Studio UI updated: removed main header, removed duplicated page card, text editor open by default.");
