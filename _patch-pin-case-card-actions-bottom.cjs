const fs = require("fs");

const path = "components\\cases\\cases-search-table.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  1) Make every case card a vertical flex container.
  This lets the action buttons stay pinned at the bottom.
*/
content = content.replace(
  'className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"',
  'className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"'
);

/*
  2) Remove the floating "المقترح" box from the top area.
  The suggested action is already clear from the bottom primary button.
*/
content = content.replace(
`        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-[11px] font-black text-slate-400">المقترح</p>
          <p className="mt-1 text-xs font-black text-slate-700">
            {getNextActionText(caseItem)}
          </p>
        </div>`,
""
);

/*
  3) Pin all actions to the bottom of the card.
*/
content = content.replace(
  '      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">',
  '      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">'
);

/*
  4) Add a small quiet hint above the action row only when useful.
*/
if (!content.includes("الإجراء التالي")) {
  content = content.replace(
`      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">`,
`      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
        الإجراء التالي: {getNextActionText(caseItem)}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">`
  );
}

/*
  5) Make bottom actions visually consistent.
*/
content = content.replaceAll(
  'rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50',
  'rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-slate-50'
);

fs.writeFileSync(path, content, "utf8");

console.log("Case card actions are now pinned to the bottom.");
