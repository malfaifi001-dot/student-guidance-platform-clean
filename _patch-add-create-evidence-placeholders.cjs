const fs = require("fs");

const path = "components\\report-engine\\report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("function createEvidencePlaceholders")) {
  const helper = `
function createEvidencePlaceholders(
  count: number,
  startIndex: number,
): NonNullable<PreviewCaseData["evidences"]> {
  return Array.from({ length: count }).map((_, index) => {
    const evidenceNumber = startIndex + index + 1;

    return {
      id: "placeholder-evidence-" + evidenceNumber,
      title: "شاهد تجريبي " + evidenceNumber,
      caption: "مكان الشاهد داخل التقرير",
      fileUrl: "",
      imageUrl: "",
    };
  });
}

`;

  if (content.includes("function getEvidencePerPage")) {
    content = content.replace("function getEvidencePerPage", helper + "function getEvidencePerPage");
  } else if (content.includes("function BlockTitle")) {
    content = content.replace("function BlockTitle", helper + "function BlockTitle");
  } else {
    content = content + helper;
  }
}

fs.writeFileSync(path, content, "utf8");
console.log("createEvidencePlaceholders helper added.");
