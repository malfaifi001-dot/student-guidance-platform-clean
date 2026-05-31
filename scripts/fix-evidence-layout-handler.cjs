const fs = require("fs");
const path = "components/reports/report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  1) إصلاح Runtime ReferenceError:
  إضافة onEvidenceLayoutChange داخل destructuring الخاص بـ EditorPanel
*/
content = content.replace(
`  onEvidenceChange,
  onEvidenceMove,
}: {`,
`  onEvidenceChange,
  onEvidenceMove,
  onEvidenceLayoutChange,
}: {`
);

/*
  2) منع التكرار لو السكربت اشتغل مرتين
*/
content = content.replace(
`  onEvidenceLayoutChange,
  onEvidenceLayoutChange,
}: {`,
`  onEvidenceLayoutChange,
}: {`
);

/*
  3) التأكد أن EvidenceManager يستقبل onEvidenceLayoutChange
*/
content = content.replace(
`  onEvidenceChange,
  onEvidenceMove,
}: {
  evidenceItems: EvidenceItem[];
  evidenceLayoutMode: EvidenceLayoutMode;
  locked: boolean;`,
`  onEvidenceChange,
  onEvidenceMove,
  onEvidenceLayoutChange,
}: {
  evidenceItems: EvidenceItem[];
  evidenceLayoutMode: EvidenceLayoutMode;
  locked: boolean;`
);

content = content.replace(
`  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
}) {`,
`  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
}) {`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح onEvidenceLayoutChange.");
