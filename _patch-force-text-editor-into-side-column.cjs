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
        const closeEnd = source.indexOf(">", match.index);
        if (closeEnd === -1) throw new Error("لم أجد نهاية details.");
        return closeEnd + 1;
      }
    } else {
      depth += 1;
    }
  }

  throw new Error("لم أجد إغلاق details لمحرر النصوص.");
}

function findNearestSectionStartBefore(source, index) {
  const candidates = [
    '<section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
    '<section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">',
    '<section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">',
  ];

  let best = -1;

  for (const candidate of candidates) {
    const found = source.lastIndexOf(candidate, index);
    if (found > best) best = found;
  }

  return best;
}

/* 1) تأكيد أن التخطيط عمود أيمن + معاينة مقابلة */
content = content.replace(
  /<div className="grid gap-5 p-5 xl:grid-cols-\[[^\"]+\](?: 2xl:grid-cols-\[[^\"]+\])?">/,
  '<div className="grid items-start gap-5 p-5 xl:grid-cols-[480px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">'
);

content = content.replace(
  /<div className="grid gap-6 p-6 xl:grid-cols-\[[^\"]+\]">/,
  '<div className="grid items-start gap-5 p-5 xl:grid-cols-[480px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">'
);

/* 2) استخراج محرر النصوص من أي مكان موجود فيه */
const editorTitle = "تعديل نصوص الصفحة الحالية";
const titleIndex = content.indexOf(editorTitle);

if (titleIndex === -1) {
  throw new Error("لم أجد محرر النصوص: تعديل نصوص الصفحة الحالية");
}

let detailsStart = content.lastIndexOf("<details", titleIndex);

if (detailsStart === -1) {
  throw new Error("لم أجد بداية details الخاصة بمحرر النصوص.");
}

let detailsEnd = findMatchingDetailsEnd(content, detailsStart);

let textEditorBlock = content.slice(detailsStart, detailsEnd);

/* حذف أي Marker قديم إن وجد قبل البلوك */
const marker = "{/* REPORT_STUDIO_SIDE_TEXT_EDITOR */}";
const markerBefore = content.lastIndexOf(marker, detailsStart);
if (markerBefore !== -1 && detailsStart - markerBefore < 80) {
  detailsStart = markerBefore;
  textEditorBlock = content.slice(detailsStart, detailsEnd);
}

/* إزالة البلوك من مكانه الحالي */
content = content.slice(0, detailsStart) + content.slice(detailsEnd);

/* تنظيف كلاس محرر النصوص وإجباره يكون مفتوح داخل العمود الجانبي */
textEditorBlock = textEditorBlock
  .replace(marker, "")
  .replace(/<details(?:\s+open)?\s+className="[^"]*">/, '<details open className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">')
  .replace(
    "هذا هو المدخل الأساسي للتعديل. عدّل النصوص هنا ثم راقب أثرها مباشرة في المعاينة بالأسفل.",
    "هذا هو المدخل الأساسي للتعديل. عدّل النصوص هنا وسترى أثرها مباشرة في المعاينة المجاورة."
  )
  .replace(
    "هذا هو المدخل الأساسي للتعديل. عدّل النصوص هنا وسترى أثرها مباشرة في المعاينة المجاورة.",
    "هذا هو المدخل الأساسي للتعديل. عدّل النصوص هنا وسترى أثرها مباشرة في المعاينة المجاورة."
  )
  .trim();

/* 3) إدخال محرر النصوص فوق كرت عنوان التقرير في العمود الأيمن */
const titleCardNeedle = "value={title}";
const titleCardIndex = content.indexOf(titleCardNeedle);

if (titleCardIndex === -1) {
  throw new Error("لم أجد كرت عنوان التقرير لإدراج محرر النصوص فوقه.");
}

const titleSectionStart = findNearestSectionStartBefore(content, titleCardIndex);

if (titleSectionStart === -1) {
  throw new Error("لم أجد بداية كرت عنوان التقرير.");
}

content =
  content.slice(0, titleSectionStart) +
  "            {/* REPORT_STUDIO_SIDE_TEXT_EDITOR */}\n            " +
  textEditorBlock +
  "\n\n" +
  content.slice(titleSectionStart);

/* 4) المعاينة تكون أعلى العمود المقابل */
content = content.replace(
  /<section className="order-\w+ rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">([\s\S]*?المعاينة الرسمية للصفحة الحالية)/,
  '<section className="order-first rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">$1'
);

/* 5) الشواهد تبقى بعد المعاينة */
content = content.replace(
  '<details className="order-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
  '<details className="order-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">'
);

/* 6) ارتفاع أفضل لحقل النص داخل العمود */
content = content.replaceAll("rows={7}", "rows={10}");

fs.writeFileSync(path, content, "utf8");

console.log("Text editor is now forced into the side column above report title. Preview remains beside it.");
