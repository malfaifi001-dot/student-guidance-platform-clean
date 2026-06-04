const fs = require("fs");

const path = "components\\report-engine\\report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

/* 1) Fix wrong theme variable inside Metric */
content = content.replace(
`function Metric({ label, value }: { label: string; value: string }) {
  const theme = getDesignThemePalette(template.designTheme);

  return (`,
`function Metric({ label, value }: { label: string; value: string }) {
  return (`
);

/* 2) Add clear Template Library button in the studio header */
if (!content.includes('href="/dashboard/admin/report-templates/library"')) {
  const marker =
`            <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              {statusLabels[template.status]}
            </span>`;

  const replacement =
`            <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              {statusLabels[template.status]}
            </span>

            <a
              href="/dashboard/admin/report-templates/library"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              مكتبة القوالب
            </a>`;

  content = content.replace(marker, replacement);
}

fs.writeFileSync(path, content, "utf8");
console.log("Metric theme error fixed and template library button added.");
