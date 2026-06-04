const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

/* =========================================================
   1) Remove bulky StatusPanel from the side column.
   We will show a compact status inside the preview header.
========================================================= */

content = content.replace(
  /\s*<StatusPanel\s+locked=\{locked\}\s+status=\{report\.status\}\s+hasChanges=\{hasChanges\}\s+textCount=\{filledTextsCount\}\s+evidenceCount=\{visibleEvidenceCount\}\s*\/>\s*/m,
  "\n"
);

/* =========================================================
   2) Remove standalone evidence settings from side column.
   It will be merged inside the evidence collapsible panel.
========================================================= */

const evidenceSettingsTitle = "إعدادات الشواهد";
const evidenceSettingsIndex = content.indexOf(evidenceSettingsTitle);

if (evidenceSettingsIndex !== -1) {
  const sectionStart = content.lastIndexOf(
    '<section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
    evidenceSettingsIndex
  );

  const nextButtonsBlock = content.indexOf(
    '\n\n            <div className="grid gap-2">',
    evidenceSettingsIndex
  );

  if (sectionStart !== -1 && nextButtonsBlock !== -1) {
    content = content.slice(0, sectionStart) + content.slice(nextButtonsBlock + 2);
  } else {
    console.log("لم أستطع حذف إعدادات الشواهد الجانبية بأمان.");
  }
} else {
  console.log("إعدادات الشواهد الجانبية غير موجودة أو حُذفت مسبقًا.");
}

/* =========================================================
   3) Put text editor first, preview second, evidence third.
========================================================= */

content = content.replace(
  '<details open className="order-2 rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">',
  '<details open className="order-first rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">'
);

content = content.replace(
  '<section className="order-first rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">',
  '<section className="order-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">'
);

content = content.replace(
  "مفتوح لأنه أهم جزء في التعديل. يمكنك إغلاقه إذا أردت التركيز على المعاينة فقط.",
  "هذا هو المدخل الأساسي للتعديل. عدّل النصوص هنا ثم راقب أثرها مباشرة في المعاينة بالأسفل."
);

/* =========================================================
   4) Compact report status inside preview header.
========================================================= */

if (!content.includes("حالة مختصرة للتقرير")) {
  content = content.replace(
    /<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">\s*تحديث مباشر قبل الحفظ\s*<\/span>/,
    `<div className="grid gap-2 text-right">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    تحديث مباشر قبل الحفظ
                  </span>

                  <div className="flex flex-wrap items-center gap-2" aria-label="حالة مختصرة للتقرير">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      الحالة: {getStatusName(report.status)}
                    </span>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black",
                        locked
                          ? "bg-slate-200 text-slate-700"
                          : hasChanges
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800",
                      ].join(" ")}
                    >
                      {locked ? "مغلق" : hasChanges ? "غير محفوظ" : "محفوظ"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                      {filledTextsCount} نص معدل · {visibleEvidenceCount} شاهد ظاهر
                    </span>
                  </div>
                </div>`
  );
}

/* =========================================================
   5) Merge evidence layout settings into the evidence collapsible panel.
========================================================= */

if (!content.includes("إعدادات عرض الشواهد داخل التقرير")) {
  const evidencePanelNeedle = `                <div className="mt-4">
                  <EvidenceEditor`;

  const evidencePanelReplacement = `                <div className="mt-4 space-y-4">
                  <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                    <h3 className="text-sm font-black text-emerald-950">
                      إعدادات عرض الشواهد داخل التقرير
                    </h3>

                    <p className="mt-1 text-xs font-bold leading-6 text-emerald-800">
                      هذا الخيار يحفظ داخل التقرير فقط، ومحرك الشواهد سيحافظ على كل شاهد داخل إطار الصفحة وينشئ صفحات إضافية عند الحاجة.
                    </p>

                    <select
                      value={evidenceLayoutMode}
                      onChange={(event) =>
                        setEvidenceLayoutMode(event.target.value as EvidenceLayoutMode)
                      }
                      disabled={locked}
                      className="mt-3 w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100"
                    >
                      {EVIDENCE_LAYOUT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </section>

                  <EvidenceEditor`;

  if (!content.includes(evidencePanelNeedle)) {
    throw new Error("لم أجد مكان دمج إعدادات الشواهد داخل كولابس الشواهد.");
  }

  content = content.replace(evidencePanelNeedle, evidencePanelReplacement);
}

/* =========================================================
   6) Tighten side column after removing status/pages/evidence settings.
========================================================= */

content = content.replace(
  '<aside className="space-y-3">',
  '<aside className="space-y-3 self-start">'
);

fs.writeFileSync(path, content, "utf8");

console.log("Report studio UI updated: text editor first, compact status in preview, evidence settings merged.");
