const fs = require("fs");

const path = "components\\report-engine\\design-renderers\\report-design-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

/* Add final value item type if missing */
if (!content.includes("type FinalReportValueItem")) {
  content = content.replace(
    "type PreviewCaseData = {",
    `type FinalReportValueItem = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
};

type PreviewCaseData = {`
  );
}

/* Type collectFinalValues return */
content = content.replace(
  "function collectFinalValues(data: any) {",
  "function collectFinalValues(data: any): FinalReportValueItem[] {"
);

/* Type filter callback inside selectedKeys block */
content = content.replace(
  `.filter((item) =>
        selectedKeys.some(`,
  `.filter((item: FinalReportValueItem) =>
        selectedKeys.some(`
);

/* Type map callbacks that may be inferred as any */
content = content.replace(
  `.map((item) => ({
        key: item.fieldKey,`,
  `.map((item: FinalReportValueItem) => ({
        key: item.fieldKey,`
);

content = content.replace(
  `return values.slice(0, 10).map((item) => ({`,
  `return values.slice(0, 10).map((item: FinalReportValueItem) => ({`
);

fs.writeFileSync(path, content, "utf8");

console.log("Final report value item types fixed.");
