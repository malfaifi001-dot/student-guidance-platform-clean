const fs = require("fs");

const path = "components/report-engine/report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

if (content.includes('title="حذف قالب التقرير؟"')) {
  console.log("نافذة تأكيد حذف القالب موجودة مسبقًا.");
  process.exit(0);
}

const runtimeMarker = "\nfunction RuntimeConnectionStatus";
const runtimeIndex = content.indexOf(runtimeMarker);

if (runtimeIndex < 0) {
  throw new Error("لم أجد function RuntimeConnectionStatus.");
}

const beforeRuntime = content.slice(0, runtimeIndex);
const afterRuntime = content.slice(runtimeIndex);

const endings = [
  "      </div>\r\n  );\r\n}\r\n\r\n",
  "      </div>\n  );\n}\n\n",
  "      </div>\r\n  );\r\n}\r\n",
  "      </div>\n  );\n}\n",
];

let ending = "";
let endingIndex = -1;

for (const candidate of endings) {
  const index = beforeRuntime.lastIndexOf(candidate);
  if (index > endingIndex) {
    ending = candidate;
    endingIndex = index;
  }
}

if (endingIndex < 0) {
  throw new Error("لم أجد نهاية ReportTemplateStudio قبل RuntimeConnectionStatus.");
}

const insert = `      {templatePendingDelete ? (
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

const cleanedBeforeRuntime =
  beforeRuntime.slice(0, endingIndex) + insert;

content = cleanedBeforeRuntime + afterRuntime;

fs.writeFileSync(path, content, "utf8");

console.log("تم حقن نوافذ تأكيد الحذف بنجاح.");
