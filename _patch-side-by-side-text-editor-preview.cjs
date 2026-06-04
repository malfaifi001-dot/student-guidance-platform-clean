const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

function findMatchingDetailsEnd(source, start) {
  const regex = /<\/?details\b/g;
  regex.lastIndex = start;

  let depth = 0;
  let match;

  while ((match = regex.exec(source))) {
    const token = match[0];

    if (token.startsWith("</")) {
      depth -= 1;

      if (depth === 0) {
        const closeEnd = source.indexOf(">", match.index);

        if (closeEnd === -1) {
          throw new Error("لم أستطع تحديد نهاية details.");
        }

        return closeEnd + 1;
      }
    } else {
      depth += 1;
    }
  }

  throw new Error("لم أجد نهاية details.");
}

/* 1) Make the layout side-by-side: right editor column + left preview column */
content = content.replace(
  '        <div className="grid gap-5 p-5 xl:grid-cols-[340px_1fr]">',
  '        <div className="grid gap-5 p-5 xl:grid-cols-[480px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">'
);

content = content.replace(
  '        <div className="grid gap-6 p-6 xl:grid-cols-[390px_1fr]">',
  '        <div className="grid gap-5 p-5 xl:grid-cols-[480px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">'
);

/* 2) Move text editor details from main preview column into the side column */
if (!content.includes("REPORT_STUDIO_SIDE_TEXT_EDITOR")) {
  const textEditorTitle = "تعديل نصوص الصفحة الحالية";
  const titleIndex = content.indexOf(textEditorTitle);

  if (titleIndex === -1) {
    throw new Error("لم أجد محرر النصوص الحالي.");
  }

  const detailsStart = content.lastIndexOf("<details", titleIndex);

  if (detailsStart === -1) {
    throw new Error("لم أجد بداية details الخاصة بمحرر النصوص.");
  }

  const detailsEnd = findMatchingDetailsEnd(content, detailsStart);

  let textEditorBlock = content.slice(detailsStart, detailsEnd);

  textEditorBlock = textEditorBlock
    .replace('className="order-first ', 'className="')
    .replace('className="order-2 ', 'className="')
    .replace('className="order-3 ', 'className="')
    .replace(
      "هذا هو المدخل الأساسي للتعديل. عدّل النصوص هنا ثم راقب أثرها مباشرة في المعاينة بالأسفل.",
      "هذا هو المدخل الأساسي للتعديل. عدّل النصوص هنا وسترى أثرها مباشرة في المعاينة المجاورة."
    );

  textEditorBlock = `{/* REPORT_STUDIO_SIDE_TEXT_EDITOR */}\n            ${textEditorBlock}`;

  content = content.slice(0, detailsStart) + content.slice(detailsEnd);

  const feedbackNeedle = "            {feedback ? <FeedbackCard feedback={feedback} /> : null}";
  const feedbackIndex = content.indexOf(feedbackNeedle);

  if (feedbackIndex === -1) {
    throw new Error("لم أجد مكان إدراج محرر النصوص في العمود الجانبي.");
  }

  const insertAt = feedbackIndex + feedbackNeedle.length;

  content =
    content.slice(0, insertAt) +
    "\n\n" +
    textEditorBlock +
    content.slice(insertAt);
}

/* 3) Ensure title card stays below text editor */
content = content.replace(
  "عنوان التقرير\n              </h2>",
  "عنوان التقرير\n              </h2>"
);

/* 4) Keep preview as the first item in the main column */
content = content.replace(
  '<section className="order-first rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
  '<section className="order-first rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">'
);

content = content.replace(
  '<section className="order-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
  '<section className="order-first rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">'
);

/* 5) Evidence stays after preview */
content = content.replace(
  '<details className="order-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
  '<details className="order-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">'
);

/* 6) Better textarea height now that editor has its own column */
content = content.replace(
  "rows={7}",
  "rows={10}"
);

/* 7) Tighten side column visual rhythm */
content = content.replace(
  '<aside className="space-y-3 self-start">',
  '<aside className="space-y-3 self-start">'
);

fs.writeFileSync(path, content, "utf8");

console.log("Text editor moved to the side column. Preview and editor are now side by side.");
