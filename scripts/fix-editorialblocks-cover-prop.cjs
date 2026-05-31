const fs = require("fs");

const path = "components/report-engine/report-builder-pdf-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  نحذف editorialBlocks من OfficialCoverPage فقط.
  الغلاف لا يحتاج نصوص Studio، النصوص تظهر في صفحات المحتوى.
*/
content = content.replace(
`              <OfficialCoverPage
                template={template}
                identity={identity}
                previewCaseData={previewCaseData}
                editorialBlocks={editorialBlocks}
              />`,
`              <OfficialCoverPage
                template={template}
                identity={identity}
                previewCaseData={previewCaseData}
              />`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم حذف editorialBlocks من OfficialCoverPage والإبقاء عليه لصفحات المحتوى فقط.");
