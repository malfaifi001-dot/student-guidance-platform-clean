const fs = require("fs");

const path = "components/reports/report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

/* إضافة نوع تخطيط الشواهد */
if (!content.includes('type EvidenceLayoutMode =')) {
  content = content.replace(
`type EditorTab = "overview" | "texts" | "values" | "evidence" | "final";`,
`type EditorTab = "overview" | "texts" | "values" | "evidence" | "final";

type EvidenceLayoutMode =
  | "auto"
  | "one-per-page"
  | "two-per-page"
  | "grid-2x2"
  | "compact";`
  );
}

/* إضافة خيارات التخطيط */
if (!content.includes('const EVIDENCE_LAYOUT_OPTIONS')) {
  content = content.replace(
`const TEXT_BLOCKS: Array<{`,
`const EVIDENCE_LAYOUT_OPTIONS: Array<{
  id: EvidenceLayoutMode;
  label: string;
  helper: string;
}> = [
  {
    id: "auto",
    label: "تلقائي",
    helper: "النظام يختار الأنسب حسب عدد الشواهد.",
  },
  {
    id: "one-per-page",
    label: "شاهد لكل صفحة",
    helper: "مناسب للشواهد المهمة أو الصور الكبيرة.",
  },
  {
    id: "two-per-page",
    label: "شاهدان في كل صفحة",
    helper: "توازن جيد بين الوضوح وتقليل الصفحات.",
  },
  {
    id: "grid-2x2",
    label: "أربعة شواهد 2×2",
    helper: "مناسب للصور الصغيرة أو الشواهد المتعددة.",
  },
  {
    id: "compact",
    label: "مختصر",
    helper: "يعرض الشواهد بشكل مضغوط داخل التقرير.",
  },
];

const TEXT_BLOCKS: Array<{`
  );
}

/* إضافة state التخطيط */
if (!content.includes('const [evidenceLayoutMode, setEvidenceLayoutMode]')) {
  content = content.replace(
`  const [savingEvidence, setSavingEvidence] = useState(false);`,
`  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceLayoutMode, setEvidenceLayoutMode] =
    useState<EvidenceLayoutMode>("two-per-page");`
  );
}

/* إدخال التخطيط في editableContent */
content = content.replace(
`        templateId: report.templateId,
        blocks,
        workflowValueOverrides,`,
`        templateId: report.templateId,
        evidenceLayoutMode,
        blocks,
        workflowValueOverrides,`
);

content = content.replace(
`    report.templateId,
  ]);`,
`    report.templateId,
    evidenceLayoutMode,
  ]);`
);

/* إدخال التخطيط في روابط preview/pdf */
content = content.replace(
`) }&studio=true&v=\${previewVersion}\`;`,
`) }&studio=true&evidenceLayout=\${evidenceLayoutMode}&v=\${previewVersion}\`;`
);

content = content.replace(
`) }&inline=true&v=\${previewVersion}\`;`,
`) }&inline=true&evidenceLayout=\${evidenceLayoutMode}&v=\${previewVersion}\`;`
);

content = content.replace(
`) }&v=\${previewVersion}\`;`,
`) }&evidenceLayout=\${evidenceLayoutMode}&v=\${previewVersion}\`;`
);

/* تمرير التخطيط إلى EditorPanel */
content = content.replace(
`              evidenceItems={evidenceItems}
              locked={locked}`,
`              evidenceItems={evidenceItems}
              evidenceLayoutMode={evidenceLayoutMode}
              locked={locked}`
);

content = content.replace(
`              onEvidenceMove={moveEvidenceItem}
            />`,
`              onEvidenceMove={moveEvidenceItem}
              onEvidenceLayoutChange={setEvidenceLayoutMode}
            />`
);

/* تحديث Props الخاصة بـ EditorPanel */
content = content.replace(
`  evidenceItems,
  locked,`,
`  evidenceItems,
  evidenceLayoutMode,
  locked,`
);

content = content.replace(
`  evidenceItems: EvidenceItem[];
  locked: boolean;`,
`  evidenceItems: EvidenceItem[];
  evidenceLayoutMode: EvidenceLayoutMode;
  locked: boolean;`
);

content = content.replace(
`  onEvidenceMove: (id: string, direction: "up" | "down") => void;
}) {`,
`  onEvidenceMove: (id: string, direction: "up" | "down") => void;
  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
}) {`
);

/* تمرير التخطيط إلى EvidenceManager */
content = content.replace(
`        evidenceItems={evidenceItems}
        locked={locked}`,
`        evidenceItems={evidenceItems}
        evidenceLayoutMode={evidenceLayoutMode}
        locked={locked}`
);

content = content.replace(
`        onEvidenceMove={onEvidenceMove}
      />`,
`        onEvidenceMove={onEvidenceMove}
        onEvidenceLayoutChange={onEvidenceLayoutChange}
      />`
);

/* تحديث Props الخاصة بـ EvidenceManager */
content = content.replace(
`  evidenceItems,
  locked,`,
`  evidenceItems,
  evidenceLayoutMode,
  locked,`
);

content = content.replace(
`  evidenceItems: EvidenceItem[];
  locked: boolean;`,
`  evidenceItems: EvidenceItem[];
  evidenceLayoutMode: EvidenceLayoutMode;
  locked: boolean;`
);

content = content.replace(
`  onEvidenceMove: (id: string, direction: "up" | "down") => void;
}) {`,
`  onEvidenceMove: (id: string, direction: "up" | "down") => void;
  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
}) {`
);

/* إضافة UI اختيار التخطيط داخل EvidenceManager */
if (!content.includes('اختر طريقة توزيع الشواهد في PDF')) {
  content = content.replace(
`        <div className="mb-4 grid grid-cols-2 gap-2">`,
`        <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-black text-slate-950">
            توزيع الشواهد داخل PDF
          </p>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            اختر طريقة توزيع الصور والمرفقات داخل التقرير الرسمي.
          </p>

          <div className="mt-4 grid gap-2">
            {EVIDENCE_LAYOUT_OPTIONS.map((option) => {
              const active = evidenceLayoutMode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onEvidenceLayoutChange(option.id)}
                  disabled={locked}
                  className={[
                    "rounded-2xl border px-4 py-3 text-right transition disabled:opacity-60",
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                  ].join(" ")}
                >
                  <span className="block text-sm font-black">
                    {option.label}
                  </span>
                  <span
                    className={[
                      "mt-1 block text-xs leading-5",
                      active ? "text-slate-200" : "text-slate-500",
                    ].join(" ")}
                  >
                    {option.helper}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold leading-6 text-blue-700">
            اختر مثلًا: شاهدان في كل صفحة، ثم اضغط حفظ التعديلات، بعدها افتح معاينة PDF.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">`
  );
}

/* جعل saveEvidenceItems لا ينهار عند رجوع HTML */
content = content.replace(
`    const data = await response.json();

    if (!response.ok || !data.success) {`,
`    const raw = await response.text();
    let data: any = null;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "مسار حفظ الشواهد رجع HTML بدل JSON. تأكد أن app/api/dashboard/reports/[reportId]/evidence/route.ts موجود ثم أعد تشغيل السيرفر."
      );
    }

    if (!response.ok || !data.success) {`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح API الشواهد وإرجاع خيارات توزيع الشواهد داخل PDF.");
