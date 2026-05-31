const fs = require("fs");

const path = "components/report-engine/report-builder-pdf-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
`        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-300 text-xs font-black text-slate-500">
          شعار
        </div>`,
`        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-white text-xs font-black text-slate-500">
          {identity.logoUrl ? (
            <img
              src={identity.logoUrl}
              alt="شعار المدرسة"
              className="h-full w-full object-contain p-2"
            />
          ) : (
            "شعار"
          )}
        </div>`
);

content = content.replace(
`        <div className="text-xs leading-5 text-slate-500">`,
`        <div className="flex items-center gap-3 text-xs leading-5 text-slate-500">`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط شعار المدرسة داخل PDF renderer.");
