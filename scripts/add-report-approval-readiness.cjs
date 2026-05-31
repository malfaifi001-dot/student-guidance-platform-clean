const fs = require("fs");

const path = "components/reports/report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

/* 1) تمرير مؤشرات الجاهزية إلى EditorPanel */
content = content.replace(
`              onEvidenceMove={moveEvidenceItem}
              onEvidenceLayoutChange={setEvidenceLayoutMode}
            />`,
`              onEvidenceMove={moveEvidenceItem}
              onEvidenceLayoutChange={setEvidenceLayoutMode}
              changedValuesCount={changedValuesCount}
              filledTextsCount={filledTextsCount}
              visibleEvidenceCount={visibleEvidenceCount}
            />`
);

/* 2) إضافة props داخل EditorPanel */
content = content.replace(
`  onEvidenceLayoutChange,
}: {`,
`  onEvidenceLayoutChange,
  changedValuesCount,
  filledTextsCount,
  visibleEvidenceCount,
}: {`
);

content = content.replace(
`  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
}) {`,
`  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
  changedValuesCount: number;
  filledTextsCount: number;
  visibleEvidenceCount: number;
}) {`
);

/* 3) استبدال تبويب الاعتماد ببطاقة فحص ذكية */
const oldFinalStart = content.indexOf(`  return (
    <div className="mt-4 space-y-4">
      <FieldCard
        title="قبل الاعتماد"`);
const oldFinalEnd = content.indexOf(`function EvidenceManager`, oldFinalStart);

if (oldFinalStart === -1 || oldFinalEnd === -1) {
  throw new Error("لم أستطع تحديد تبويب الاعتماد القديم.");
}

const newFinalBlock = `  return (
    <ApprovalReadinessPanel
      report={report}
      title={title}
      filledTextsCount={filledTextsCount}
      changedValuesCount={changedValuesCount}
      visibleEvidenceCount={visibleEvidenceCount}
      evidenceLayoutMode={evidenceLayoutMode}
      locked={locked}
    />
  );
}

`;

content =
  content.slice(0, oldFinalStart) +
  newFinalBlock +
  content.slice(oldFinalEnd);

/* 4) إضافة مكون ApprovalReadinessPanel قبل EvidenceManager */
content = content.replace(
`function EvidenceManager({`,
`function ApprovalReadinessPanel({
  report,
  title,
  filledTextsCount,
  changedValuesCount,
  visibleEvidenceCount,
  evidenceLayoutMode,
  locked,
}: {
  report: StudioReport;
  title: string;
  filledTextsCount: number;
  changedValuesCount: number;
  visibleEvidenceCount: number;
  evidenceLayoutMode: EvidenceLayoutMode;
  locked: boolean;
}) {
  const checks = [
    {
      label: "عنوان التقرير",
      ok: Boolean(title.trim()),
      helper: title.trim()
        ? "العنوان موجود وجاهز للظهور في التقرير."
        : "أضف عنوانًا واضحًا للتقرير قبل الاعتماد.",
    },
    {
      label: "النصوص التحريرية",
      ok: filledTextsCount > 0,
      helper:
        filledTextsCount > 0
          ? \`تمت تعبئة \${filledTextsCount} قسم نصي.\`
          : "يفضل إضافة مقدمة أو نتائج أو توصيات قبل الاعتماد.",
    },
    {
      label: "قيم الحالة",
      ok: report.reportValues.length > 0,
      helper:
        report.reportValues.length > 0
          ? \`يوجد \${report.reportValues.length} قيمة قادمة من الحالة.\`
          : "لا توجد قيم حالة ظاهرة في التقرير.",
    },
    {
      label: "الشواهد الظاهرة",
      ok: visibleEvidenceCount > 0,
      helper:
        visibleEvidenceCount > 0
          ? \`يوجد \${visibleEvidenceCount} شاهد ظاهر في التقرير.\`
          : "لا توجد شواهد ظاهرة. يمكن الاعتماد بدون شواهد إذا كان ذلك مقصودًا.",
      warningOnly: true,
    },
    {
      label: "توزيع الشواهد",
      ok: Boolean(evidenceLayoutMode),
      helper: \`التوزيع الحالي: \${getEvidenceLayoutName(evidenceLayoutMode)}.\`,
    },
  ];

  const blockingIssues = checks.filter((check) => !check.ok && !check.warningOnly);
  const warnings = checks.filter((check) => !check.ok && check.warningOnly);
  const ready = blockingIssues.length === 0;

  return (
    <div className="mt-4 space-y-4">
      <section
        className={[
          "rounded-3xl border p-5",
          ready
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50",
        ].join(" ")}
      >
        <p
          className={[
            "text-xs font-black",
            ready ? "text-emerald-700" : "text-amber-700",
          ].join(" ")}
        >
          فحص جاهزية التقرير
        </p>

        <h3
          className={[
            "mt-2 text-xl font-black",
            ready ? "text-emerald-950" : "text-amber-950",
          ].join(" ")}
        >
          {ready ? "التقرير جاهز للاعتماد" : "التقرير يحتاج مراجعة قبل الاعتماد"}
        </h3>

        <p
          className={[
            "mt-2 text-sm leading-7",
            ready ? "text-emerald-800" : "text-amber-800",
          ].join(" ")}
        >
          {ready
            ? "يمكنك الآن فتح معاينة PDF ثم اعتماد التقرير بثقة."
            : "راجع العناصر التالية قبل الاعتماد حتى يظهر التقرير بشكل رسمي ومكتمل."}
        </p>
      </section>

      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">
                  {check.label}
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {check.helper}
                </p>
              </div>

              <span
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-black",
                  check.ok
                    ? "bg-emerald-50 text-emerald-700"
                    : check.warningOnly
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700",
                ].join(" ")}
              >
                {check.ok ? "مكتمل" : check.warningOnly ? "تنبيه" : "مطلوب"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {locked ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold leading-7 text-slate-600">
          هذا التقرير مغلق لأنه معتمد أو مؤرشف.
        </div>
      ) : warnings.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-800">
          يوجد تنبيه غير مانع. تستطيع الاعتماد إذا كان التقرير لا يحتاج شواهد.
        </div>
      ) : null}
    </div>
  );
}

function getEvidenceLayoutName(value: EvidenceLayoutMode) {
  if (value === "one-per-page") return "شاهد لكل صفحة";
  if (value === "two-per-page") return "شاهدان في كل صفحة";
  if (value === "grid-2x2") return "أربعة شواهد 2×2";
  if (value === "compact") return "مختصر";
  return "تلقائي";
}

function EvidenceManager({`
);

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة فحص جاهزية التقرير قبل الاعتماد.");
