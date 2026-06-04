const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `            {activePageHasEvidence ? (
              <EvidenceEditor
                locked={locked}
                items={evidenceItems}
                onUpdate={updateEvidenceItem}
                onMove={moveEvidenceItem}
              />
            ) : null}`;

const newBlock = `            {activePageHasEvidence ? (
              <details className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      الشواهد والمرفقات
                    </h2>

                    <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                      مغلقة افتراضيًا لتبسيط الصفحة. افتحها فقط إذا أردت تعديل ترتيب الشواهد أو التعليقات أو الإظهار.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                      {evidenceItems.filter((item) => item.visible).length} ظاهر من {evidenceItems.length}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      فتح / إخفاء
                    </span>
                  </div>
                </summary>

                <div className="mt-4">
                  <EvidenceEditor
                    locked={locked}
                    items={evidenceItems}
                    onUpdate={updateEvidenceItem}
                    onMove={moveEvidenceItem}
                  />
                </div>
              </details>
            ) : null}`;

if (content.includes("مغلقة افتراضيًا لتبسيط الصفحة")) {
  console.log("Evidence panel is already collapsible.");
} else if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
} else {
  const regex = /\s*\{activePageHasEvidence \? \(\s*<EvidenceEditor\s+locked=\{locked\}\s+items=\{evidenceItems\}\s+onUpdate=\{updateEvidenceItem\}\s+onMove=\{moveEvidenceItem\}\s*\/>\s*\) : null\}/;

  if (!regex.test(content)) {
    throw new Error("لم أجد كتلة EvidenceEditor داخل report-studio-editor.tsx. ارفع الملف الحالي لو استمر الخطأ.");
  }

  content = content.replace(regex, "\n" + newBlock);
}

fs.writeFileSync(path, content, "utf8");

console.log("Evidence editor panel is now collapsible by default.");
