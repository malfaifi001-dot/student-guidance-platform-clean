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

/* Ensure renderer import exists */
if (!content.includes("report-design-renderer")) {
  replaceOnce(
    'import { useEffect, useMemo, useState } from "react";',
    'import { useEffect, useMemo, useState } from "react";\nimport {\n  ReportDesignRenderer,\n  reportDesignTemplates,\n  type ReportDesignId,\n} from "@/components/report-engine/design-renderers/report-design-renderer";'
  );
}

/* Ensure StudioTemplate stores designTemplateId */
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

/* Ensure initial template has a design */
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

/* Ensure saved templates hydrate designTemplateId */
if (!content.includes("designTemplateId: templateJson.designTemplateId")) {
  replaceOnce(
    '    id: templateJson.id || item?.id || fallback.id,\n    name:',
    '    id: templateJson.id || item?.id || fallback.id,\n    designTemplateId:\n      templateJson.designTemplateId ||\n      smartStudio.designTemplateId ||\n      "ministry-form",\n    name:'
  );
}

/* Ensure saving designTemplateId */
if (!content.includes('designTemplateId: template.designTemplateId || "ministry-form"')) {
  replaceOnce(
    '      documentType: template.documentType,\n      designTheme:',
    '      documentType: template.documentType,\n      designTemplateId: template.designTemplateId || "ministry-form",\n      designTheme:'
  );

  replaceOnce(
    '      documentType: template.documentType,\n      designPreset:',
    '      documentType: template.documentType,\n      designTemplateId: template.designTemplateId || "ministry-form",\n      designPreset:'
  );

  replaceOnce(
    '        mode: "multi-page-workflow-aware",\n        pages: template.pages,',
    '        mode: "multi-page-workflow-aware",\n        designTemplateId: template.designTemplateId || "ministry-form",\n        pages: template.pages,'
  );
}

/* Add design gallery if missing */
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
                  هذه تصاميم تقارير مختلفة فعليًا، وليست تغيير ألوان فقط. اختر التصميم وستتغير بنية المعاينة مباشرة.
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

            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
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
                        ? design.activeCardClass
                        : design.cardClass,
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-black text-slate-900">
                        {design.name}
                      </strong>

                      <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-600">
                        {design.badge}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500">
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

/* Make existing gallery cards use design-specific colors */
content = content.replaceAll(
`active
                        ? "border-emerald-600 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:bg-white",`,
`active
                        ? design.activeCardClass
                        : design.cardClass,`
);

if (!content.includes("{design.badge}")) {
  content = content.replaceAll(
`                    <strong className="text-xs font-black text-slate-900">
                      {design.name}
                    </strong>

                    <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">`,
`                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-black text-slate-900">
                        {design.name}
                      </strong>

                      <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-600">
                        {design.badge}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500">`
  );
}

/* Ensure OfficialPagePreview delegates to external renderer */
if (!content.includes("<ReportDesignRenderer")) {
  content = content.replace(
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
}

fs.writeFileSync(path, content, "utf8");
console.log("Studio updated for 10 independent report designs.");
