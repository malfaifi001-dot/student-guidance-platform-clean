const fs = require("fs");

const path = "components\\report-engine\\design-renderers\\report-design-renderer.tsx";
let content = fs.readFileSync(path, "utf8");

/* Add identity accent inside DesignBlock */
content = content.replace(
`  const rendered = renderText(block.content || "", context);
  const textAlign = block.align === "center" ? "text-center" : "text-right";`,
`  const rendered = renderText(block.content || "", context);
  const textAlign = block.align === "center" ? "text-center" : "text-right";
  const accent = getDesignAccentClasses(designId);`
);

/* Hero service color follows design identity */
content = content.replace(
`        <p className="text-xs font-black text-emerald-700">{context["service.name"]}</p>`,
`        <p className={["text-xs font-black", accent.subtleTextClass].join(" ")}>
          {context["service.name"]}
        </p>`
);

/* Bullet dots follow design identity */
content = content.replace(
`              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />`,
`              <span className={["mt-2 h-2 w-2 shrink-0 rounded-full", accent.dotClass].join(" ")} />`
);

/* Add identity accent inside EvidenceBlock */
content = content.replace(
`  const hiddenCount = Math.max(realEvidences.length - (startIndex + perPage), 0);

  if (!realEvidences.length && block.evidenceEmptyBehavior === "hide") return null;`,
`  const hiddenCount = Math.max(realEvidences.length - (startIndex + perPage), 0);
  const accent = getDesignAccentClasses(designId);

  if (!realEvidences.length && block.evidenceEmptyBehavior === "hide") return null;`
);

/* Evidence attachment badge follows design identity */
content = content.replace(
`              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                {isPlaceholderMode ? "معاينة" : "شاهد"}
              </span>`,
`              <span className={["rounded-full px-3 py-1 text-[11px] font-black", accent.badgeClass].join(" ")}>
                {isPlaceholderMode ? "معاينة" : "شاهد"}
              </span>`
);

/* Evidence placeholder icon follows design identity */
content = content.replace(
`                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">📎</div>`,
`                  <div className={["flex h-14 w-14 items-center justify-center rounded-2xl text-2xl", accent.iconClass].join(" ")}>📎</div>`
);

/* Evidence empty note follows design identity */
content = content.replace(
`        <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          هذه مربعات معاينة فقط. عند اختبار Case ID يحتوي شواهد، سيتم عرض الشواهد الفعلية هنا.
        </p>`,
`        <p className={["mt-3 rounded-2xl px-3 py-2 text-xs font-bold", accent.noticeClass].join(" ")}>
          هذه مربعات معاينة فقط. عند اختبار Case ID يحتوي شواهد، سيتم عرض الشواهد الفعلية هنا.
        </p>`
);

/* Replace block card system so each report design has its own card identity */
content = content.replace(
/function getBlockShellClass\(designId: ReportDesignId, variant: string, textAlign: string\) \{[\s\S]*?\n\}\n\nfunction getPlacementClass/,
`function getDesignAccentClasses(designId: ReportDesignId) {
  switch (designId) {
    case "modern-official":
      return {
        subtleTextClass: "text-sky-700",
        dotClass: "bg-sky-700",
        iconClass: "bg-sky-50 text-sky-700",
        badgeClass: "bg-sky-50 text-sky-700",
        noticeClass: "bg-sky-50 text-sky-700",
        cardShellClass: "rounded-3xl border border-sky-100 bg-white p-5 shadow-sm",
        softShellClass: "rounded-3xl border border-sky-100 bg-sky-50 p-5",
        highlightShellClass: "rounded-3xl border border-sky-200 bg-gradient-to-l from-sky-50 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-3xl border border-dashed border-sky-300 bg-white p-5",
        quoteShellClass: "rounded-3xl border border-sky-100 bg-slate-50 p-5",
        heroShellClass: "rounded-3xl border border-sky-100 bg-gradient-to-l from-sky-50 to-white p-5",
      };

    case "evidence-showcase":
      return {
        subtleTextClass: "text-emerald-700",
        dotClass: "bg-emerald-700",
        iconClass: "bg-emerald-50 text-emerald-700",
        badgeClass: "bg-emerald-50 text-emerald-700",
        noticeClass: "bg-emerald-50 text-emerald-700",
        cardShellClass: "rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm",
        softShellClass: "rounded-[28px] border border-emerald-100 bg-emerald-50 p-5",
        highlightShellClass: "rounded-[28px] border border-emerald-200 bg-gradient-to-l from-emerald-50 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-[28px] border border-dashed border-emerald-300 bg-white p-5",
        quoteShellClass: "rounded-[28px] border border-emerald-100 bg-teal-50 p-5",
        heroShellClass: "rounded-[28px] border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-5",
      };

    case "formal-memo":
      return {
        subtleTextClass: "text-zinc-800",
        dotClass: "bg-zinc-800",
        iconClass: "bg-zinc-100 text-zinc-800",
        badgeClass: "bg-zinc-100 text-zinc-700",
        noticeClass: "bg-zinc-100 text-zinc-800",
        cardShellClass: "border-b border-zinc-300 bg-white px-1 py-4",
        softShellClass: "border-b border-zinc-300 bg-zinc-50 px-4 py-4",
        highlightShellClass: "border border-zinc-800 bg-zinc-50 p-5",
        outlineShellClass: "border border-dashed border-zinc-500 bg-white p-5",
        quoteShellClass: "border-r-4 border-zinc-800 bg-zinc-50 p-5",
        heroShellClass: "border-b-2 border-zinc-800 bg-white px-1 py-5",
      };

    case "counseling-case-file":
      return {
        subtleTextClass: "text-teal-700",
        dotClass: "bg-teal-700",
        iconClass: "bg-teal-50 text-teal-700",
        badgeClass: "bg-teal-50 text-teal-700",
        noticeClass: "bg-teal-50 text-teal-700",
        cardShellClass: "rounded-3xl border border-teal-100 bg-white p-5 shadow-sm",
        softShellClass: "rounded-3xl border border-teal-100 bg-teal-50 p-5",
        highlightShellClass: "rounded-3xl border border-teal-200 bg-gradient-to-l from-teal-50 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-3xl border border-dashed border-teal-300 bg-white p-5",
        quoteShellClass: "rounded-3xl border border-teal-100 bg-slate-50 p-5",
        heroShellClass: "rounded-3xl border border-teal-100 bg-gradient-to-l from-teal-50 to-white p-5",
      };

    case "behavior-followup":
      return {
        subtleTextClass: "text-amber-700",
        dotClass: "bg-amber-700",
        iconClass: "bg-amber-50 text-amber-700",
        badgeClass: "bg-amber-50 text-amber-700",
        noticeClass: "bg-amber-50 text-amber-700",
        cardShellClass: "rounded-3xl border border-amber-100 bg-white p-5 shadow-sm",
        softShellClass: "rounded-3xl border border-amber-100 bg-amber-50 p-5",
        highlightShellClass: "rounded-3xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-3xl border border-dashed border-amber-300 bg-white p-5",
        quoteShellClass: "rounded-3xl border border-amber-100 bg-orange-50 p-5",
        heroShellClass: "rounded-3xl border border-amber-100 bg-gradient-to-l from-amber-50 to-white p-5",
      };

    case "program-impact":
      return {
        subtleTextClass: "text-cyan-700",
        dotClass: "bg-cyan-700",
        iconClass: "bg-cyan-50 text-cyan-700",
        badgeClass: "bg-cyan-50 text-cyan-700",
        noticeClass: "bg-cyan-50 text-cyan-700",
        cardShellClass: "rounded-[28px] border border-cyan-100 bg-white p-5 shadow-sm",
        softShellClass: "rounded-[28px] border border-cyan-100 bg-cyan-50 p-5",
        highlightShellClass: "rounded-[28px] border border-cyan-200 bg-gradient-to-l from-cyan-50 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-[28px] border border-dashed border-cyan-300 bg-white p-5",
        quoteShellClass: "rounded-[28px] border border-cyan-100 bg-blue-50 p-5",
        heroShellClass: "rounded-[28px] border border-cyan-100 bg-gradient-to-l from-cyan-50 to-white p-5",
      };

    case "girls-rose-official":
      return {
        subtleTextClass: "text-rose-700",
        dotClass: "bg-rose-600",
        iconClass: "bg-rose-50 text-rose-600",
        badgeClass: "bg-rose-50 text-rose-700",
        noticeClass: "bg-rose-50 text-rose-700",
        cardShellClass: "rounded-[28px] border border-rose-100 bg-white p-5 shadow-sm",
        softShellClass: "rounded-[28px] border border-rose-100 bg-rose-50 p-5",
        highlightShellClass: "rounded-[28px] border border-rose-200 bg-gradient-to-l from-rose-50 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-[28px] border border-dashed border-rose-300 bg-white p-5",
        quoteShellClass: "rounded-[28px] border border-rose-100 bg-pink-50 p-5",
        heroShellClass: "rounded-[28px] border border-rose-100 bg-gradient-to-l from-rose-50 to-white p-5",
      };

    case "girls-lilac-elegant":
      return {
        subtleTextClass: "text-violet-700",
        dotClass: "bg-violet-700",
        iconClass: "bg-violet-50 text-violet-700",
        badgeClass: "bg-violet-50 text-violet-700",
        noticeClass: "bg-violet-50 text-violet-700",
        cardShellClass: "rounded-[28px] border border-violet-100 bg-white p-5 shadow-sm",
        softShellClass: "rounded-[28px] border border-violet-100 bg-violet-50 p-5",
        highlightShellClass: "rounded-[28px] border border-violet-200 bg-gradient-to-l from-violet-50 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-[28px] border border-dashed border-violet-300 bg-white p-5",
        quoteShellClass: "rounded-[28px] border border-violet-100 bg-fuchsia-50 p-5",
        heroShellClass: "rounded-[28px] border border-violet-100 bg-gradient-to-l from-violet-50 to-white p-5",
      };

    case "girls-pearl-calm":
      return {
        subtleTextClass: "text-fuchsia-700",
        dotClass: "bg-fuchsia-700",
        iconClass: "bg-fuchsia-50 text-fuchsia-700",
        badgeClass: "bg-fuchsia-50 text-fuchsia-700",
        noticeClass: "bg-fuchsia-50 text-fuchsia-700",
        cardShellClass: "rounded-[28px] border border-fuchsia-100 bg-white p-5 shadow-sm",
        softShellClass: "rounded-[28px] border border-fuchsia-100 bg-fuchsia-50 p-5",
        highlightShellClass: "rounded-[28px] border border-fuchsia-200 bg-gradient-to-l from-fuchsia-50 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-[28px] border border-dashed border-fuchsia-300 bg-white p-5",
        quoteShellClass: "rounded-[28px] border border-fuchsia-100 bg-rose-50 p-5",
        heroShellClass: "rounded-[28px] border border-fuchsia-100 bg-gradient-to-l from-fuchsia-50 to-white p-5",
      };

    case "ministry-form":
    default:
      return {
        subtleTextClass: "text-slate-800",
        dotClass: "bg-slate-800",
        iconClass: "bg-slate-100 text-slate-800",
        badgeClass: "bg-slate-100 text-slate-700",
        noticeClass: "bg-slate-100 text-slate-800",
        cardShellClass: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        softShellClass: "rounded-3xl border border-slate-200 bg-slate-50 p-5",
        highlightShellClass: "rounded-3xl border border-slate-300 bg-gradient-to-l from-slate-100 to-white p-5 shadow-sm",
        outlineShellClass: "rounded-3xl border border-dashed border-slate-400 bg-white p-5",
        quoteShellClass: "rounded-3xl border border-slate-200 bg-slate-50 p-5",
        heroShellClass: "rounded-3xl border border-slate-200 bg-gradient-to-l from-slate-50 to-white p-5",
      };
  }
}

function getBlockShellClass(designId: ReportDesignId, variant: string, textAlign: string) {
  const base = \`break-inside-avoid \${textAlign}\`;
  const accent = getDesignAccentClasses(designId);

  if (variant === "hero") return \`\${base} \${accent.heroShellClass}\`;
  if (variant === "plain") return \`\${base} px-1 py-2\`;
  if (variant === "soft") return \`\${base} \${accent.softShellClass}\`;
  if (variant === "highlight") return \`\${base} \${accent.highlightShellClass}\`;
  if (variant === "outline") return \`\${base} \${accent.outlineShellClass}\`;
  if (variant === "quote") return \`\${base} \${accent.quoteShellClass}\`;

  return \`\${base} \${accent.cardShellClass}\`;
}

function getPlacementClass`
);

fs.writeFileSync(path, content, "utf8");
console.log("Report block cards now follow each design identity.");
