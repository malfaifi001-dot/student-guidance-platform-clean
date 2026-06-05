const fs = require("fs");

const filePath = "components/dashboard/soft-blue-dashboard.tsx";

let text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

function fail(message) {
  console.error(message);
  console.error("\nلم يتم تعديل soft-blue-dashboard.tsx. أرسل لي الملف إذا ظهرت هذه الرسالة.");
  process.exit(1);
}

if (!text.includes("DashboardAttentionMiniCard")) {
  const importLine =
    'import { DashboardAttentionMiniCard, type DashboardAttentionMiniReminder } from "@/components/dashboard/dashboard-attention-mini-card";';

  const firstImportEnd = text.lastIndexOf('";', text.indexOf("\n\n"));

  if (firstImportEnd >= 0) {
    text = text.slice(0, firstImportEnd + 2) + "\n" + importLine + text.slice(firstImportEnd + 2);
  } else {
    text = importLine + "\n" + text;
  }
}

if (text.includes("type SoftBlueDashboardProps = {")) {
  if (!text.includes("attentionReminders?: DashboardAttentionMiniReminder[];")) {
    text = text.replace(
      "type SoftBlueDashboardProps = {",
      "type SoftBlueDashboardProps = {\n  attentionReminders?: DashboardAttentionMiniReminder[];"
    );
  }

  text = text.replace(
    /export function SoftBlueDashboard\(\{\s*user,\s*stats\s*\}:\s*SoftBlueDashboardProps\)/,
    "export function SoftBlueDashboard({ user, stats, attentionReminders = [] }: SoftBlueDashboardProps)"
  );
} else {
  text = text.replace(
    /export function SoftBlueDashboard\(\{\s*user,\s*stats\s*\}:/,
    "export function SoftBlueDashboard({ user, stats, attentionReminders = [] }:"
  );

  if (!text.includes("attentionReminders?: DashboardAttentionMiniReminder[]")) {
    text = text.replace(
      /stats:\s*\{[\s\S]*?\};/,
      (match) => `${match}\n  attentionReminders?: DashboardAttentionMiniReminder[];`
    );
  }
}

if (!text.includes("attentionReminders = []")) {
  fail("لم أستطع تعديل باراميترات SoftBlueDashboard تلقائيًا.");
}

const marker = text.indexOf("اقتراحات الآن");

if (marker < 0) {
  fail("لم أجد كرت اقتراحات الآن داخل soft-blue-dashboard.tsx.");
}

function findOpeningTagStart(source, markerIndex) {
  const candidateTags = ["section", "aside", "article"];

  for (const tag of candidateTags) {
    const index = source.lastIndexOf(`<${tag}`, markerIndex);
    if (index >= 0 && markerIndex - index < 5000) {
      return { index, tag };
    }
  }

  const divIndex = source.lastIndexOf("<div", markerIndex);
  if (divIndex >= 0 && markerIndex - divIndex < 3000) {
    return { index: divIndex, tag: "div" };
  }

  return null;
}

function findMatchingTagEnd(source, startIndex, tag) {
  const pattern = new RegExp(`<${tag}(?=\\s|>|/)|</${tag}>`, "g");
  pattern.lastIndex = startIndex;

  let depth = 0;
  let match;

  while ((match = pattern.exec(source))) {
    const token = match[0];

    if (token.startsWith(`</${tag}`)) {
      depth--;

      if (depth === 0) {
        return pattern.lastIndex;
      }
    } else {
      depth++;
    }
  }

  return -1;
}

const opening = findOpeningTagStart(text, marker);

if (!opening) {
  fail("لم أجد بداية كرت اقتراحات الآن.");
}

const end = findMatchingTagEnd(text, opening.index, opening.tag);

if (end < 0) {
  fail("لم أجد نهاية كرت اقتراحات الآن.");
}

const replacement = "<DashboardAttentionMiniCard reminders={attentionReminders} />";

text = text.slice(0, opening.index) + replacement + text.slice(end);

fs.writeFileSync(filePath, text, "utf8");

console.log("تم نقل كرت التقويم إلى مكان اقتراحات الآن وحذف ظهوره من أعلى الصفحة.");
