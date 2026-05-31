const fs = require("fs");

const path = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("OfficialFeatureRequiredPage")) {
  content = content.replace(
`import { getCurrentSessionUser } from "@/lib/auth/current-user";`,
`import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { OfficialFeatureRequiredPage } from "@/components/auth/official-feature-required-page";
import { canUseOfficialFeatures, getMissingOfficialIdentityItems } from "@/lib/auth/official-feature-guard";`
  );
}

if (!content.includes("const officialIdentityMissingItems = getMissingOfficialIdentityItems")) {
  content = content.replace(
`  const runtimeReportIdentity = buildReportIdentityFromCurrentUser(
    currentSession?.user ?? null
  );`,
`  const runtimeReportIdentity = buildReportIdentityFromCurrentUser(
    currentSession?.user ?? null
  );

  const officialIdentityMissingItems = currentSession?.user
    ? getMissingOfficialIdentityItems(currentSession.user)
    : [];

  const officialIdentityReady = currentSession?.user
    ? canUseOfficialFeatures(currentSession.user)
    : false;

  if (!officialIdentityReady && !pdfMode) {
    return (
      <OfficialFeatureRequiredPage
        title="أكمل هوية المدرسة قبل معاينة التقرير الرسمي"
        description="معاينة التقرير الرسمي تعتمد على بيانات المدرسة والموجه/الموجهة حتى تظهر الترويسة والغلاف بشكل صحيح."
        missingItems={officialIdentityMissingItems}
      />
    );
  }`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط حارس الهوية الرسمية بصفحة معاينة التقرير.");
