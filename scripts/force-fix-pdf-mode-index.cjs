const fs = require("fs");

function replaceBetween(content, startMarker, endMarker, replacement, label) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start);

  if (start === -1) {
    throw new Error(`لم أجد بداية: ${label}`);
  }

  if (end === -1) {
    throw new Error(`لم أجد نهاية: ${label}`);
  }

  return content.slice(0, start) + replacement + content.slice(end);
}

/* =========================
   1) Live Preview
========================= */

const livePath = "components/report-engine/report-template-live-preview.tsx";
let live = fs.readFileSync(livePath, "utf8");

live = live.replace(
  /type ReportTemplateLivePreviewProps = \{[\s\S]*?\};/,
  `type ReportTemplateLivePreviewProps = {
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
  pdfMode?: boolean;
};`
);

const newComponent = `export function ReportTemplateLivePreview({
  template,
  snippets,
  previewCaseData,
  pdfMode = false,
}: ReportTemplateLivePreviewProps) {
  return (
    <section
      className={
        pdfMode
          ? "bg-white p-0"
          : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      {!pdfMode ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              المعاينة الحية للقالب
            </h2>

            <p className="mt-1 text-sm leading-7 text-slate-500">
              هذه المعاينة تقرأ صفحات القالب وبلوكاته، وتستخدم بيانات Case ID إن وجدت،
              وتعرض نصوص مكتبة النصوص حسب إعدادات بلوك النصوص.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-600">
            {previewCaseData ? "معاينة من Case حقيقي" : "معاينة ببيانات تجريبية"}
          </div>
        </div>
      ) : null}

      <div className={pdfMode ? "space-y-0" : "mt-5 space-y-6"}>
        {template.pages.map((page, pageIndex) => (
          <article
            key={page.id}
            style={
              pdfMode
                ? {
                    pageBreakAfter:
                      pageIndex < template.pages.length - 1 ? "always" : "auto",
                  }
                : undefined
            }
            className={
              pdfMode
                ? "mx-auto h-[297mm] min-h-[297mm] w-[210mm] max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none"
                : "mx-auto min-h-[720px] max-w-[820px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm"
            }
          >
            {!pdfMode ? (
              <div className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-emerald-700">
                      صفحة {pageIndex + 1}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      {page.title}
                    </h3>

                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      {page.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                    {getPageKindLabel(page.kind)}
                  </span>
                </div>
              </div>
            ) : null}

            <div
              className={[
                pdfMode
                  ? "min-h-[297mm] bg-white p-[16mm]"
                  : "min-h-[640px] bg-white p-8",
                page.kind === "cover" ? "flex flex-col justify-between" : "",
              ].join(" ")}
            >
              {page.kind === "cover" ? (
                <CoverPreviewHeader template={template} pageTitle={page.title} />
              ) : null}

              <div className="space-y-5">
                {page.blocks.length ? (
                  page.blocks.map((block) => (
                    <PreviewBlock
                      key={block.id}
                      block={block}
                      template={template}
                      snippets={snippets}
                      previewCaseData={previewCaseData}
                    />
                  ))
                ) : !pdfMode ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-bold text-slate-500">
                      لا توجد بلوكات في هذه الصفحة.
                    </p>
                  </div>
                ) : null}
              </div>

              {page.kind === "cover" ? (
                <CoverPreviewFooter template={template} />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

`;

live = replaceBetween(
  live,
  "export function ReportTemplateLivePreview",
  "function PreviewBlock",
  newComponent,
  "ReportTemplateLivePreview"
);

live = live.replace(
  /<footer className="border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-500">/g,
  `<footer className="no-print border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-500">`
);

fs.writeFileSync(livePath, live, "utf8");

/* =========================
   2) Preview Page
========================= */

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

preview = preview.replace(
  /studio\?: string;\s*view\?: string;\s*v\?: string;/,
  `studio?: string;
    view?: string;
    pdf?: string;
    v?: string;`
);

preview = preview.replace(
  /const studioMode = resolvedSearchParams\.studio === "true";\s*const showCover = resolvedSearchParams\.cover !== "false";/,
  `const studioMode = resolvedSearchParams.studio === "true";
  const pdfMode = resolvedSearchParams.pdf === "true";
  const showCover = resolvedSearchParams.cover !== "false";`
);

preview = preview.replace(
  /className=\{\s*studioMode\s*\?\s*"min-h-screen bg-slate-100 py-5"\s*:\s*"min-h-screen bg-\[radial-gradient\(circle_at_top,_#e0f2fe_0,_#f8fafc_34%,_#f1f5f9_100%\)\] px-6 py-6"\s*\}/,
  `className={
        pdfMode
          ? "min-h-screen bg-white p-0"
          : studioMode
            ? "min-h-screen bg-slate-100 py-5"
            : "min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0,_#f8fafc_34%,_#f1f5f9_100%)] px-6 py-6"
      }`
);

preview = preview.replace(
  /<section className=\{studioMode \? "mx-auto" : "mx-auto max-w-\[260mm\]"\}>/,
  `<section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>`
);

preview = preview.replace(
  /previewCaseData=\{builderPreviewCaseData as any\}\s*\/>/,
  `previewCaseData={builderPreviewCaseData as any}
            pdfMode={pdfMode}
          />`
);

fs.writeFileSync(previewPath, preview, "utf8");

console.log("تم إدخال pdfMode بطريقة indexOf بنجاح.");
