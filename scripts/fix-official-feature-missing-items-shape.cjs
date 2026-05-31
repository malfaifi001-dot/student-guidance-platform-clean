const fs = require("fs");

const path = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  تحويل officialIdentityMissingItems من string[] إلى object[]
  عند تمريرها إلى OfficialFeatureRequiredPage.
*/
content = content.replace(
`        missingItems={officialIdentityMissingItems}
      />`,
`        missingItems={officialIdentityMissingItems.map((item) => ({
          label: item,
          description: "هذا الحقل مطلوب حتى تظهر التقارير الرسمية بهوية مكتملة.",
        }))}
      />`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم تحويل missingItems إلى الشكل المطلوب للواجهة.");
