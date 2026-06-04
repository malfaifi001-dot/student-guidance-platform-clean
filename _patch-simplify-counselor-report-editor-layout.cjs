const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

/* 1) Parent becomes flex so we can prioritize preview visually */
content = content.replace(
  '          <section className="min-w-0 space-y-4">',
  '          <section className="flex min-w-0 flex-col gap-4">'
);

/* 2) Convert text editor panel into a collapsed details panel */
const textEditorStartNeedle = `            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    {activePage?.title || "صفحة التقرير"}
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                    حرر النصوص الخاصة بهذه الصفحة. النصوص المقترحة تعرض القيم
                    الحقيقية حتى يسهل فهمها.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {editableBlocks.length} بلوك نصي
                </span>
              </div>

              <div className="mt-5 space-y-4">`;

const textEditorReplacement = `            <details className="order-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    تعديل نصوص الصفحة الحالية
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                    مغلق افتراضيًا لتبسيط الصفحة. افتحه فقط إذا أردت تعديل نصوص بلوكات هذه الصفحة.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                    {activePage?.title || "صفحة التقرير"}
                  </span>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {editableBlocks.length} بلوك نصي
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                    فتح / إخفاء
                  </span>
                </div>
              </summary>

              <div className="mt-4 space-y-4">`;

if (!content.includes("تعديل نصوص الصفحة الحالية")) {
  if (!content.includes(textEditorStartNeedle)) {
    throw new Error("لم أجد بداية لوحة تحرير النصوص. ارفع الملف الحالي إذا استمر الخطأ.");
  }

  content = content.replace(textEditorStartNeedle, textEditorReplacement);

  const afterReplacementIndex = content.indexOf(textEditorReplacement);

  const endNeedle = `            </section>

            {activePageHasEvidence ? (`;

  const endIndex = content.indexOf(endNeedle, afterReplacementIndex);

  if (endIndex === -1) {
    throw new Error("لم أجد نهاية لوحة تحرير النصوص.");
  }

  content =
    content.slice(0, endIndex) +
    `            </details>

            {activePageHasEvidence ? (` +
    content.slice(endIndex + endNeedle.length);
}

/* 3) Keep evidence panel after text editor in visual order */
const evidencePhrase = "مغلقة افتراضيًا لتبسيط الصفحة";
const evidencePhraseIndex = content.indexOf(evidencePhrase);

if (evidencePhraseIndex !== -1) {
  const detailsStart = content.lastIndexOf('<details className="', evidencePhraseIndex);
  const detailsEnd = content.indexOf('">', detailsStart);

  if (detailsStart !== -1 && detailsEnd !== -1) {
    const currentDetailsTag = content.slice(detailsStart, detailsEnd + 2);

    if (!currentDetailsTag.includes("order-3")) {
      const nextDetailsTag = currentDetailsTag.replace(
        '<details className="',
        '<details className="order-3 '
      );

      content =
        content.slice(0, detailsStart) +
        nextDetailsTag +
        content.slice(detailsEnd + 2);
    }
  }
}

/* 4) Make live preview the first and primary panel */
const previewTitle = "المعاينة الرسمية للصفحة الحالية";
const previewTitleIndex = content.indexOf(previewTitle);

if (previewTitleIndex === -1) {
  throw new Error("لم أجد لوحة المعاينة الرسمية.");
}

const previewSectionStart = content.lastIndexOf(
  '<section className="',
  previewTitleIndex
);

const previewSectionTagEnd = content.indexOf('">', previewSectionStart);

if (previewSectionStart === -1 || previewSectionTagEnd === -1) {
  throw new Error("لم أستطع تعديل كلاس لوحة المعاينة.");
}

const currentPreviewTag = content.slice(previewSectionStart, previewSectionTagEnd + 2);

if (!currentPreviewTag.includes("order-first")) {
  const nextPreviewTag = currentPreviewTag.replace(
    '<section className="',
    '<section className="order-first '
  );

  content =
    content.slice(0, previewSectionStart) +
    nextPreviewTag +
    content.slice(previewSectionTagEnd + 2);
}

/* 5) Improve preview heading copy */
content = content.replace(
  "مثل معاينة الأدمن: اختر الصفحة وشاهدها مباشرة بدون تمرير طويل بين كل الصفحات.",
  "المعاينة هي الأساس هنا. اختر الصفحة من الأعلى، ثم افتح تحرير النصوص فقط عند الحاجة."
);

fs.writeFileSync(path, content, "utf8");

console.log("Counselor report editor simplified: preview first, text editor collapsed.");
