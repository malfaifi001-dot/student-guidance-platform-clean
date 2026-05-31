const fs = require("fs");

const path = "components/report-engine/report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

if (content.includes('title="حذف قالب التقرير؟"')) {
  console.log("نوافذ تأكيد الحذف موجودة مسبقًا.");
  process.exit(0);
}

const marker = `
      </div>
  );
}


function RuntimeConnectionStatus`;

if (!content.includes(marker)) {
  throw new Error("لم أجد مكان نهاية ReportTemplateStudio لإضافة نوافذ التأكيد.");
}

const replacement = `
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
              من القالب الحالي. هذا لا يحذف بيانات الحالة ولا التقارير السابقة.
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


function RuntimeConnectionStatus`;

content = content.replace(marker, replacement);

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة نوافذ تأكيد الحذف بنجاح.");
