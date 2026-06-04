const fs = require("fs");

const path = "components\\report-engine\\report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("شريط التصاميم السريع")) {
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

  const replacement = `          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-700">
                  شريط التصاميم السريع
                </p>
                <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                  هذه تصاميم لنفس القالب، وليست قوالب منفصلة. اختر التصميم وستتغير المعاينة مباشرة.
                </p>
              </div>

              <select
                value={template.designTheme || "MINISTRY_CLASSIC"}
                onChange={(event) =>
                  updateTemplate({
                    designTheme: event.target.value as StudioDesignTheme,
                  })
                }
                className="min-w-72 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
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
                        ? "border-emerald-600 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:bg-white",
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

${marker}`;

  content = content.replace(marker, replacement);
}

fs.writeFileSync(path, content, "utf8");
console.log("Visible theme switcher added.");
