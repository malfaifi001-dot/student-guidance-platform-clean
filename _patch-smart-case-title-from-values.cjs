const fs = require("fs");

const detailsPath = "components\\cases\\case-details-view.tsx";
let details = fs.readFileSync(detailsPath, "utf8");

if (!details.includes("function getSmartCaseDisplayTitle")) {
  const helper = `
function normalizeSmartCaseTitleText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\\s+/g, " ")
    .trim();
}

function cleanSmartCaseTitle(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined" || text.length > 140) {
    return "";
  }

  return text;
}

function stringifySmartCaseTitleCandidate(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return cleanSmartCaseTitle(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = stringifySmartCaseTitleCandidate(item);

      if (candidate) {
        return candidate;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of [
      "program_name",
      "programName",
      "program",
      "guidanceProgram",
      "guidance_program",
      "selectedProgram",
      "activityName",
      "activity_name",
      "title",
      "name",
      "label",
      "value",
    ]) {
      const candidate = stringifySmartCaseTitleCandidate(record[key]);

      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function isGenericSmartCaseTitle(title: string) {
  const normalized = normalizeSmartCaseTitleText(title);

  return (
    !normalized ||
    normalized === "بدون عنوان" ||
    normalized === "حاله بدون عنوان" ||
    normalized === "حالة بدون عنوان" ||
    normalized === "حاله جديده" ||
    normalized === "حالة جديدة" ||
    normalized.includes("برنامج ارشادي جديد")
  );
}

function isSmartTitleLikeCaseField(value: any) {
  const text = normalizeSmartCaseTitleText(
    [value?.fieldKey, value?.field?.key, value?.field?.label]
      .filter(Boolean)
      .join(" "),
  );

  return (
    text.includes("program") ||
    text.includes("activity") ||
    text.includes("title") ||
    text.includes("برنامج") ||
    text.includes("النشاط") ||
    text.includes("عنوان") ||
    text.includes("موضوع")
  );
}

function getSmartCaseDisplayTitle(caseEntry: any) {
  const values = Array.isArray(caseEntry.values) ? caseEntry.values : [];

  for (const value of values) {
    if (!isSmartTitleLikeCaseField(value)) {
      continue;
    }

    const candidate =
      stringifySmartCaseTitleCandidate(value?.jsonValue) ||
      stringifySmartCaseTitleCandidate(value?.value);

    if (candidate && !isGenericSmartCaseTitle(candidate)) {
      return candidate;
    }
  }

  const savedTitle = cleanSmartCaseTitle(caseEntry.title);

  if (savedTitle && !isGenericSmartCaseTitle(savedTitle)) {
    return savedTitle;
  }

  return caseEntry.service?.name || "تفاصيل الحالة";
}

`;

  details = details.replace(
    "export function CaseDetailsView",
    helper + "\nexport function CaseDetailsView"
  );
}

if (!details.includes("const displayTitle = getSmartCaseDisplayTitle(caseEntry);")) {
  details = details.replace(
    "export function CaseDetailsView({ caseEntry }: CaseDetailsViewProps) {",
    `export function CaseDetailsView({ caseEntry }: CaseDetailsViewProps) {
  const displayTitle = getSmartCaseDisplayTitle(caseEntry);`
  );
}

details = details.replace(
  /<h1 className="mt-3 text-4xl font-black">\s*\{caseEntry\.title \|\| "[^"]*"\}\s*<\/h1>/,
  `<h1 className="mt-3 text-4xl font-black">
          {displayTitle}
        </h1>`
);

fs.writeFileSync(detailsPath, details, "utf8");

const reportNewPath = "app\\dashboard\\reports\\new\\page.tsx";
let reportNew = fs.readFileSync(reportNewPath, "utf8");

if (!reportNew.includes("function getSmartReportCaseTitle")) {
  const helper = `
function normalizeReportCaseTitleText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\\s+/g, " ")
    .trim();
}

function cleanReportCaseTitle(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined" || text.length > 140) {
    return "";
  }

  return text;
}

function stringifyReportCaseTitleCandidate(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return cleanReportCaseTitle(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = stringifyReportCaseTitleCandidate(item);

      if (candidate) {
        return candidate;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of [
      "program_name",
      "programName",
      "program",
      "guidanceProgram",
      "guidance_program",
      "selectedProgram",
      "activityName",
      "activity_name",
      "title",
      "name",
      "label",
      "value",
    ]) {
      const candidate = stringifyReportCaseTitleCandidate(record[key]);

      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function isGenericReportCaseTitle(title: string) {
  const normalized = normalizeReportCaseTitleText(title);

  return (
    !normalized ||
    normalized === "بدون عنوان" ||
    normalized === "حاله بدون عنوان" ||
    normalized === "حالة بدون عنوان" ||
    normalized === "حاله جديده" ||
    normalized === "حالة جديدة" ||
    normalized.includes("برنامج ارشادي جديد")
  );
}

function isReportCaseTitleField(value: any) {
  const text = normalizeReportCaseTitleText(
    [value?.fieldKey, value?.field?.key, value?.field?.label]
      .filter(Boolean)
      .join(" "),
  );

  return (
    text.includes("program") ||
    text.includes("activity") ||
    text.includes("title") ||
    text.includes("برنامج") ||
    text.includes("النشاط") ||
    text.includes("عنوان") ||
    text.includes("موضوع")
  );
}

function getSmartReportCaseTitle(caseEntry: any) {
  const values = Array.isArray(caseEntry.values) ? caseEntry.values : [];

  for (const value of values) {
    if (!isReportCaseTitleField(value)) {
      continue;
    }

    const candidate =
      stringifyReportCaseTitleCandidate(value?.jsonValue) ||
      stringifyReportCaseTitleCandidate(value?.value);

    if (candidate && !isGenericReportCaseTitle(candidate)) {
      return candidate;
    }
  }

  const savedTitle = cleanReportCaseTitle(caseEntry.title);

  if (savedTitle && !isGenericReportCaseTitle(savedTitle)) {
    return savedTitle;
  }

  return caseEntry.service?.name || "حالة جديدة";
}

`;

  reportNew = reportNew.replace(
    "export default async function NewReportPage",
    helper + "\nexport default async function NewReportPage"
  );
}

reportNew = reportNew.replace(
  "title: caseEntry.title || caseEntry.service.name,",
  "title: getSmartReportCaseTitle(caseEntry),"
);

fs.writeFileSync(reportNewPath, reportNew, "utf8");

console.log("Smart case titles now use program/activity title first, then service name.");
