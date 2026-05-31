const fs = require("fs");

const path = "components/report-engine/report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

if (content.includes('title="حذف قالب التقرير؟"')) {
  console.log("نافذة حذف القالب موجودة مسبقًا.");
  process.exit(0);
}

const functionMarker = "\nfunction RuntimeConnectionStatus";
const functionIndex = content.indexOf(functionMarker);

if (functionIndex < 0) {
  throw new Error("لم أجد function RuntimeConnectionStatus.");
}

const beforeRuntime = content.slice(0, functionIndex);
const afterRuntime = content.slice(functionIndex);

const endPattern = /\s*<\/div>\r?\n\s*\);\r?\n\}\r?\n\s*$/;
const match = beforeRuntime.match(endPattern);

if (!match) {
  throw new Error("لم أجد نهاية ReportTemplateStudio لإدخال نوافذ التأكيد.");
}

const insert = `
      {templatePendingDelete ? (
        <ConfirmModal
          title="حذف قالب التقرير؟"
          description={
            <>
              سيتم حذف قالب{" "}
              <span className="font-black text-slate-900">
                {templatePendingDelete.name}
              </span>{" "}
              من قائمة القوالب. إذا كان محفوظًا فسيتم حذفه من قاعدة البيانات أيضًا.
            </>
          }
          confirmLabel="نعم، احذف القالب"
          onCancel={() => setTemplatePendingDelete(null)}
          onConfirm={confirmDeleteTemplate}
        />
      ) : null}

      {pagePendingDelete ? (
        <ConfirmModal
          title="حذف صفحة من القالب؟"
          description={
            <>
              سيتم حذف صفحة{" "}
              <span className="font-black text-slate-900">
                {pagePendingDelete.title}
              </span>{" "}
              من القالب الحالي.
            </>
          }
          confirmLabel="نعم، احذف الصفحة"
          onCancel={() => setPagePendingDelete(null)}
          onConfirm={confirmDeletePage}
        />
      ) : null}
    </div>
  );
}
`;

const cleanedBeforeRuntime = beforeRuntime.replace(endPattern, insert);

content = cleanedBeforeRuntime + afterRuntime;

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة نوافذ تأكيد الحذف قبل نهاية ReportTemplateStudio.");
