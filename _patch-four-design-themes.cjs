const fs = require("fs");

const path = "components\\report-engine\\report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

function replaceOnce(search, replacement) {
  if (content.includes(search)) {
    content = content.replace(search, replacement);
    return true;
  }
  return false;
}

/* 1) Theme type */
if (!content.includes("type StudioDesignTheme")) {
  replaceOnce(
    'type PageKind = "content" | "recommendations" | "evidence" | "approval" | "custom";',
    'type PageKind = "content" | "recommendations" | "evidence" | "approval" | "custom";\n\ntype StudioDesignTheme =\n  | "MINISTRY_CLASSIC"\n  | "DEEP_NAVY"\n  | "WARM_SAND"\n  | "MODERN_VIOLET";'
  );
}

/* 2) Add designTheme to StudioTemplate */
if (!content.includes("designTheme?: StudioDesignTheme;")) {
  replaceOnce(
    '  status: TemplateStatus;\n  scope: TemplateScope;',
    '  status: TemplateStatus;\n  designTheme?: StudioDesignTheme;\n  scope: TemplateScope;'
  );
}

/* 3) Theme options */
if (!content.includes("const designThemeOptions")) {
  replaceOnce(
    'const pageKindLabels: Record<PageKind, string> = {',
    `const designThemeOptions: Array<{
  value: StudioDesignTheme;
  label: string;
  description: string;
}> = [
  {
    value: "MINISTRY_CLASSIC",
    label: "تصميم الوزارة الكلاسيكي",
    description: "قريب من نموذج الوزارة: شريط علوي داكن، حضور رسمي واضح، وفوتر أخضر.",
  },
  {
    value: "DEEP_NAVY",
    label: "الأزرق الأكاديمي",
    description: "تصميم رسمي أزرق هادئ مناسب للتقارير التفصيلية واللجان.",
  },
  {
    value: "WARM_SAND",
    label: "الرملي الدافئ",
    description: "تصميم مختلف بألوان رملية وذهبية مناسب للتقارير الإنسانية والمتابعات.",
  },
  {
    value: "MODERN_VIOLET",
    label: "البنفسجي الحديث",
    description: "تصميم عصري مختلف مناسب للتقارير المختصرة والعروض البصرية.",
  },
];

const pageKindLabels: Record<PageKind, string> = {`
  );
}

/* 4) Initial theme */
if (!content.includes('designTheme: "MINISTRY_CLASSIC"')) {
  replaceOnce(
    '    status: "DRAFT",\n    scope: "GLOBAL",',
    '    status: "DRAFT",\n    designTheme: "MINISTRY_CLASSIC",\n    scope: "GLOBAL",'
  );
}

/* 5) Hydrate saved theme */
if (!content.includes('designTheme: templateJson.designTheme')) {
  replaceOnce(
    '    scope:\n      templateJson.scope',
    '    designTheme: templateJson.designTheme || smartStudio.designTheme || "MINISTRY_CLASSIC",\n    scope:\n      templateJson.scope'
  );
}

/* 6) Save theme */
if (!content.includes('designTheme: template.designTheme || "MINISTRY_CLASSIC"')) {
  replaceOnce(
    '      documentType: template.documentType,\n      designPreset:',
    '      documentType: template.documentType,\n      designTheme: template.designTheme || "MINISTRY_CLASSIC",\n      designPreset:'
  );
}

if (!content.includes('designTheme: template.designTheme || "MINISTRY_CLASSIC",\n        pages: template.pages')) {
  replaceOnce(
    '        mode: "multi-page-workflow-aware",\n        pages: template.pages,',
    '        mode: "multi-page-workflow-aware",\n        designTheme: template.designTheme || "MINISTRY_CLASSIC",\n        pages: template.pages,'
  );
}

/* 7) Theme selector UI */
if (!content.includes("تصميم الصفحة الرسمي")) {
  const marker = '            {feedback ? (';
  const selector = String.raw`            <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    تصميم الصفحة الرسمي
                  </p>
                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                    اختر هوية التصميم. التغيير يظهر مباشرة في معاينة A4 ولا يغيّر البلوكات أو النصوص.
                  </p>
                </div>

                <select
                  value={template.designTheme || "MINISTRY_CLASSIC"}
                  onChange={(event) =>
                    updateTemplate({
                      designTheme: event.target.value as StudioDesignTheme,
                    })
                  }
                  className="min-w-64 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                >
                  {designThemeOptions.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {designThemeOptions.map((theme) => {
                  const active = (template.designTheme || "MINISTRY_CLASSIC") === theme.value;

                  return (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() =>
                        updateTemplate({
                          designTheme: theme.value,
                        })
                      }
                      className={[
                        "rounded-2xl border p-3 text-right transition",
                        active
                          ? "border-emerald-600 bg-white shadow-sm"
                          : "border-slate-200 bg-white/70 hover:bg-white",
                      ].join(" ")}
                    >
                      <strong className="text-xs font-black text-slate-900">
                        {theme.label}
                      </strong>

                      <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                        {theme.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

`;
  replaceOnce(marker, selector + marker);
}

/* 8) Add theme helper */
if (!content.includes("function getDesignThemePalette")) {
  const helper = String.raw`
function getDesignThemePalette(theme?: StudioDesignTheme) {
  switch (theme || "MINISTRY_CLASSIC") {
    case "DEEP_NAVY":
      return {
        previewShellClass:
          "mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[18px] border border-sky-100 bg-sky-50 p-[8mm] shadow-xl",
        pageClass:
          "relative min-h-[279mm] rounded-[16px] border border-sky-100 bg-white p-[12mm]",
        innerFrameClass:
          "pointer-events-none absolute inset-4 rounded-[14px] border border-sky-50",
        headerClass:
          "relative z-10 rounded-[18px] border border-sky-200 bg-gradient-to-l from-slate-900 via-sky-900 to-slate-800 p-5 text-white",
        logoWrapClass:
          "flex h-20 w-28 items-center justify-center p-0",
        logoImageClass:
          "h-16 w-auto object-contain brightness-0 invert",
        headerTitleClass:
          "text-sm font-black text-white",
        headerSubtitleClass:
          "mt-1 text-xs font-bold text-sky-100",
        badgeClass:
          "rounded-2xl border border-sky-200/40 bg-white/10 p-3 text-center backdrop-blur",
        badgeLabelClass:
          "text-[10px] font-black text-sky-100",
        badgeValueClass:
          "mt-1 text-sm font-black text-white",
        footerBarClass:
          "h-1 rounded-full bg-gradient-to-l from-sky-700 to-sky-200",
      };

    case "WARM_SAND":
      return {
        previewShellClass:
          "mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[30px] border border-amber-100 bg-[#fbf4e8] p-[9mm] shadow-xl",
        pageClass:
          "relative min-h-[279mm] rounded-[24px] border border-amber-100 bg-[#fffdf7] p-[12mm]",
        innerFrameClass:
          "pointer-events-none absolute inset-4 rounded-[22px] border border-amber-100/70",
        headerClass:
          "relative z-10 rounded-[24px] border border-amber-200 bg-gradient-to-l from-amber-100 via-white to-orange-50 p-5",
        logoWrapClass:
          "flex h-20 w-28 items-center justify-center p-0",
        logoImageClass:
          "h-16 w-auto object-contain",
        headerTitleClass:
          "text-sm font-black text-amber-950",
        headerSubtitleClass:
          "mt-1 text-xs font-bold text-amber-800",
        badgeClass:
          "rounded-2xl border border-amber-200 bg-white p-3 text-center",
        badgeLabelClass:
          "text-[10px] font-black text-amber-500",
        badgeValueClass:
          "mt-1 text-sm font-black text-amber-900",
        footerBarClass:
          "h-1 rounded-full bg-gradient-to-l from-amber-700 to-orange-200",
      };

    case "MODERN_VIOLET":
      return {
        previewShellClass:
          "mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[32px] border border-violet-100 bg-violet-50 p-[9mm] shadow-xl",
        pageClass:
          "relative min-h-[279mm] rounded-[26px] border border-violet-100 bg-white p-[12mm]",
        innerFrameClass:
          "pointer-events-none absolute inset-4 rounded-[24px] border border-violet-50",
        headerClass:
          "relative z-10 rounded-[26px] border border-violet-100 bg-gradient-to-l from-violet-700 via-indigo-700 to-slate-900 p-5 text-white",
        logoWrapClass:
          "flex h-20 w-28 items-center justify-center p-0",
        logoImageClass:
          "h-16 w-auto object-contain brightness-0 invert",
        headerTitleClass:
          "text-sm font-black text-white",
        headerSubtitleClass:
          "mt-1 text-xs font-bold text-violet-100",
        badgeClass:
          "rounded-2xl border border-white/20 bg-white/10 p-3 text-center backdrop-blur",
        badgeLabelClass:
          "text-[10px] font-black text-violet-100",
        badgeValueClass:
          "mt-1 text-sm font-black text-white",
        footerBarClass:
          "h-1 rounded-full bg-gradient-to-l from-violet-700 to-fuchsia-200",
      };

    case "MINISTRY_CLASSIC":
    default:
      return {
        previewShellClass:
          "mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-none border border-slate-200 bg-white p-0 shadow-xl",
        pageClass:
          "relative min-h-[297mm] bg-white p-[12mm] pt-[48mm]",
        innerFrameClass:
          "pointer-events-none absolute inset-0 border border-slate-100",
        headerClass:
          "absolute left-0 right-0 top-0 z-10 rounded-b-[42px] bg-[#1d343f] px-[18mm] py-[10mm] text-white",
        logoWrapClass:
          "mx-auto flex h-20 w-32 items-center justify-center p-0",
        logoImageClass:
          "h-18 w-auto object-contain brightness-0 invert",
        headerTitleClass:
          "text-sm font-black text-white",
        headerSubtitleClass:
          "mt-1 text-xs font-bold text-slate-100",
        badgeClass:
          "rounded-none border-0 bg-transparent p-0 text-center",
        badgeLabelClass:
          "text-[10px] font-black text-slate-200",
        badgeValueClass:
          "mt-1 text-sm font-black text-white",
        footerBarClass:
          "h-1 rounded-none bg-gradient-to-l from-[#1d343f] via-emerald-700 to-emerald-200",
      };
  }
}

`;

  if (content.includes("function getServiceName")) {
    content = content.replace("function getServiceName", helper + "function getServiceName");
  } else {
    content += helper;
  }
}

/* 9) OfficialPagePreview theme variable */
if (!content.includes("const theme = getDesignThemePalette(template.designTheme);")) {
  replaceOnce(
    '}) {\n  return (',
    '}) {\n  const theme = getDesignThemePalette(template.designTheme);\n\n  return ('
  );
}

/* 10) Pass theme to auto evidence pages */
replaceOnce(
  '      <AutoEvidencePages\n        activePage={activePage}\n        context={context}\n        previewCase={previewCase}\n      />',
  '      <AutoEvidencePages\n        activePage={activePage}\n        context={context}\n        previewCase={previewCase}\n        designTheme={template.designTheme}\n      />'
);

/* 11) AutoEvidencePages props */
replaceOnce(
  'function AutoEvidencePages({\n  activePage,\n  context,\n  previewCase,\n}: {\n  activePage?: StudioPage;\n  context: Record<string, string>;\n  previewCase: PreviewCaseData | null;\n}) {',
  'function AutoEvidencePages({\n  activePage,\n  context,\n  previewCase,\n  designTheme,\n}: {\n  activePage?: StudioPage;\n  context: Record<string, string>;\n  previewCase: PreviewCaseData | null;\n  designTheme?: StudioDesignTheme;\n}) {\n  const theme = getDesignThemePalette(designTheme);'
);

/* 12) Replace preview classes */
content = content.replaceAll(
  'className="mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[28px] border border-emerald-100 bg-[#f1faf5] p-[9mm] shadow-xl"',
  'className={theme.previewShellClass}'
);

content = content.replaceAll(
  'className="relative min-h-[279mm] rounded-[24px] border border-emerald-100 bg-white p-[12mm]"',
  'className={theme.pageClass}'
);

content = content.replaceAll(
  'className="pointer-events-none absolute inset-4 rounded-[22px] border border-emerald-50"',
  'className={theme.innerFrameClass}'
);

content = content.replaceAll(
  'className="relative z-10 rounded-[22px] border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-5"',
  'className={theme.headerClass}'
);

content = content.replaceAll(
  'className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-100 bg-white p-2"',
  'className={theme.logoWrapClass}'
);

content = content.replaceAll(
  'className="flex h-20 w-28 items-center justify-center p-0"',
  'className={theme.logoWrapClass}'
);

content = content.replaceAll(
  'className="max-h-full max-w-full object-contain"',
  'className={theme.logoImageClass}'
);

content = content.replaceAll(
  'className="h-16 w-auto object-contain"',
  'className={theme.logoImageClass}'
);

content = content.replaceAll(
  'className="text-sm font-black text-emerald-900"',
  'className={theme.headerTitleClass}'
);

content = content.replaceAll(
  'className="mt-1 text-xs font-bold text-slate-600"',
  'className={theme.headerSubtitleClass}'
);

content = content.replaceAll(
  'className="rounded-2xl border border-emerald-100 bg-white p-3 text-center"',
  'className={theme.badgeClass}'
);

content = content.replaceAll(
  'className="text-[10px] font-black text-slate-400"',
  'className={theme.badgeLabelClass}'
);

content = content.replaceAll(
  'className="mt-1 text-sm font-black text-emerald-800"',
  'className={theme.badgeValueClass}'
);

content = content.replaceAll(
  'className="h-1 rounded-full bg-gradient-to-l from-emerald-700 to-emerald-200"',
  'className={theme.footerBarClass}'
);

fs.writeFileSync(path, content, "utf8");
console.log("Four design themes patch completed.");
