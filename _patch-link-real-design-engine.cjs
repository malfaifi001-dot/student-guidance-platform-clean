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

function replaceRegex(regex, replacement) {
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    return true;
  }
  return false;
}

/* 1) Import real design renderer */
if (!content.includes("report-design-renderer")) {
  replaceOnce(
    'import { useEffect, useMemo, useState } from "react";',
    'import { useEffect, useMemo, useState } from "react";\nimport {\n  ReportDesignRenderer,\n  reportDesignTemplates,\n  type ReportDesignId,\n} from "@/components/report-engine/design-renderers/report-design-renderer";'
  );
}

/* 2) Add designTemplateId to template type */
if (!content.includes("designTemplateId?: ReportDesignId;")) {
  if (
    !replaceOnce(
      "  status: TemplateStatus;\n  designTheme?: StudioDesignTheme;\n  scope: TemplateScope;",
      "  status: TemplateStatus;\n  designTheme?: StudioDesignTheme;\n  designTemplateId?: ReportDesignId;\n  scope: TemplateScope;"
    )
  ) {
    replaceOnce(
      "  status: TemplateStatus;\n  scope: TemplateScope;",
      "  status: TemplateStatus;\n  designTemplateId?: ReportDesignId;\n  scope: TemplateScope;"
    );
  }
}

/* 3) Initial selected real design */
if (!content.includes('designTemplateId: "ministry-form"')) {
  if (
    !replaceOnce(
      '    designTheme: "MINISTRY_CLASSIC",\n    scope: "GLOBAL",',
      '    designTheme: "MINISTRY_CLASSIC",\n    designTemplateId: "ministry-form",\n    scope: "GLOBAL",'
    )
  ) {
    replaceOnce(
      '    status: "DRAFT",\n    scope: "GLOBAL",',
      '    status: "DRAFT",\n    designTemplateId: "ministry-form",\n    scope: "GLOBAL",'
    );
  }
}

/* 4) Hydrate saved selected design */
if (!content.includes("designTemplateId: templateJson.designTemplateId")) {
  replaceOnce(
    '    id: templateJson.id || item?.id || fallback.id,\n    name:',
    '    id: templateJson.id || item?.id || fallback.id,\n    designTemplateId:\n      templateJson.designTemplateId ||\n      smartStudio.designTemplateId ||\n      "ministry-form",\n    name:'
  );
}

/* 5) Save selected design */
if (!content.includes('designTemplateId: template.designTemplateId || "ministry-form"')) {
  replaceOnce(
    '      documentType: template.documentType,\n      designTheme:',
    '      documentType: template.documentType,\n      designTemplateId: template.designTemplateId || "ministry-form",\n      designTheme:'
  );

  replaceOnce(
    '      documentType: template.documentType,\n      designPreset:',
    '      documentType: template.documentType,\n      designTemplateId: template.designTemplateId || "ministry-form",\n      designPreset:'
  );
}

if (!content.includes('designTemplateId: template.designTemplateId || "ministry-form",\n        pages: template.pages')) {
  replaceOnce(
    '        designTheme: template.designTheme || "MINISTRY_CLASSIC",\n        pages: template.pages,',
    '        designTheme: template.designTheme || "MINISTRY_CLASSIC",\n        designTemplateId: template.designTemplateId || "ministry-form",\n        pages: template.pages,'
  );

  replaceOnce(
    '        mode: "multi-page-workflow-aware",\n        pages: template.pages,',
    '        mode: "multi-page-workflow-aware",\n        designTemplateId: template.designTemplateId || "ministry-form",\n        pages: template.pages,'
  );
}

/* 6) Remove wrong theme leftovers that leaked outside preview */
content = content.replace(
`function Metric({ label, value }: { label: string; value: string }) {
  const theme = getDesignThemePalette(template.designTheme);

  return (`,
`function Metric({ label, value }: { label: string; value: string }) {
  return (`
);

content = content.replaceAll(
  'className={theme.headerTitleClass}',
  'className="text-sm font-black text-emerald-900"'
);
content = content.replaceAll(
  'className={theme.headerSubtitleClass}',
  'className="mt-1 text-xs font-bold text-slate-600"'
);
content = content.replaceAll(
  'className={theme.badgeClass}',
  'className="rounded-2xl border border-emerald-100 bg-white p-3 text-center"'
);
content = content.replaceAll(
  'className={theme.badgeLabelClass}',
  'className="text-[10px] font-black text-slate-400"'
);
content = content.replaceAll(
  'className={theme.badgeValueClass}',
  'className="mt-1 text-sm font-black text-emerald-800"'
);
content = content.replaceAll(
  'className={theme.footerBarClass}',
  'className="h-1 rounded-full bg-gradient-to-l from-emerald-700 to-emerald-200"'
);

/* 7) Add real design gallery above preview */
if (!content.includes("معرض التصاميم الحقيقية")) {
  const marker = `          <OfficialPagePreview
            template={template}
            activePage={activePage}
            activePageId={activePageId}
            context={runtimeContext}
            previewCase={previewCase}
            onActivePageChange={(pageId) => {
              const page = template.pages.find((item) => item.id === pageId);
              setActivePageId(pageId);
              setSelectedBlockId(page?.blocks[0]?.id || "");
            }}
            onAddPage={() => addPage("content")}
          />`;

  const selector = `          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-700">
                  معرض التصاميم الحقيقية
                </p>
                <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                  هذه ليست ألوان فقط؛ كل تصميم يرسم الصفحة بطريقة مختلفة. اختر التصميم وستتغير بنية المعاينة مباشرة.
                </p>
              </div>

              <select
                value={template.designTemplateId || "ministry-form"}
                onChange={(event) =>
                  updateTemplate({
                    designTemplateId: event.target.value as ReportDesignId,
                  })
                }
                className="min-w-72 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
              >
                {reportDesignTemplates.map((design) => (
                  <option key={design.id} value={design.id}>
                    {design.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {reportDesignTemplates.map((design) => {
                const active = (template.designTemplateId || "ministry-form") === design.id;

                return (
                  <button
                    key={design.id}
                    type="button"
                    onClick={() =>
                      updateTemplate({
                        designTemplateId: design.id,
                      })
                    }
                    className={[
                      "rounded-2xl border p-3 text-right transition",
                      active
                        ? "border-emerald-600 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:bg-white",
                    ].join(" ")}
                  >
                    <strong className="text-xs font-black text-slate-900">
                      {design.name}
                    </strong>

                    <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                      {design.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

${marker}`;

  content = content.replace(marker, selector);
}

/* 8) Replace old preview implementation with the external renderer */
replaceRegex(
  /function OfficialPagePreview\(\{[\s\S]*?\nfunction PreviewBlock/,
`function OfficialPagePreview({
  template,
  activePage,
  activePageId,
  context,
  previewCase,
  onActivePageChange,
  onAddPage,
}: {
  template: StudioTemplate;
  activePage?: StudioPage;
  activePageId: string;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  onActivePageChange: (pageId: string) => void;
  onAddPage: () => void;
}) {
  return (
    <ReportDesignRenderer
      designId={template.designTemplateId || "ministry-form"}
      template={template}
      activePage={activePage}
      activePageId={activePageId}
      context={context}
      previewCase={previewCase}
      onActivePageChange={onActivePageChange}
      onAddPage={onAddPage}
    />
  );
}

function PreviewBlock`
);

fs.writeFileSync(path, content, "utf8");
console.log("Studio linked to real design renderer engine.");
