const fs = require("fs");

const path = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(path, "utf8");

const lines = content.split(/\r?\n/);

/*
  نحذف أي تعريف قديم لـ const pdfMode من أي مكان
  ثم نعيد وضعه قبل أول استخدام له.
*/
const cleanedLines = [];
let skippingPdfModeBlock = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes("const pdfMode")) {
    skippingPdfModeBlock = true;

    if (line.trim().endsWith(";")) {
      skippingPdfModeBlock = false;
    }

    continue;
  }

  if (skippingPdfModeBlock) {
    if (line.trim().endsWith(";")) {
      skippingPdfModeBlock = false;
    }

    continue;
  }

  cleanedLines.push(line);
}

let nextContent = cleanedLines.join("\n");

const guardLine = `  if (!officialIdentityReady && !pdfMode) {`;

if (!nextContent.includes(guardLine)) {
  throw new Error("لم أجد سطر officialIdentityReady guard داخل صفحة preview.");
}

const pdfModeBlock = `  const pdfMode =
    resolvedSearchParams.pdf === "true" ||
    resolvedSearchParams.studio === "true" ||
    resolvedSearchParams.inline === "true";
`;

nextContent = nextContent.replace(guardLine, `${pdfModeBlock}\n${guardLine}`);

fs.writeFileSync(path, nextContent, "utf8");

console.log("تم نقل تعريف pdfMode قبل أول استخدام له.");
