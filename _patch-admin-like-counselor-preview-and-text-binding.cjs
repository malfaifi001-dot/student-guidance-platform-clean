const fs = require("fs");

const path = "components\\reports\\report-studio-editor.tsx";
let content = fs.readFileSync(path, "utf8");

function replaceOnce(search, replacement) {
  if (!content.includes(search)) {
    return false;
  }

  content = content.replace(search, replacement);
  return true;
}

/* 1) Import the final design renderer for live page preview */
if (!content.includes("FinalReportDesignRenderer")) {
  content = content.replace(
    'import { useRouter } from "next/navigation";',
    'import { useRouter } from "next/navigation";\nimport { FinalReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";'
  );
}

/* 2) Add active preview template and preview case data */
if (!content.includes("const livePreviewTemplate = useMemo")) {
  const marker = `  const pdfDownloadUrl = \`/api/dashboard/reports/\${report.id}/export/pdf?template=\${encodeURIComponent(
    report.templateId || "",
  )}&v=\${previewVersion}\`;`;

  const insertion = `  const pdfDownloadUrl = \`/api/dashboard/reports/\${report.id}/export/pdf?template=\${encodeURIComponent(
    report.templateId || "",
  )}&v=\${previewVersion}\`;

  const livePreviewTemplate = useMemo(() => {
    const livePage = buildLivePreviewPage({
      page: activePage,
      blocks: cleanBlockOverrides,
      context: runtimeContext,
    });

    return {
      ...template,
      pages: livePage ? [livePage] : [],
    };
  }, [activePage, cleanBlockOverrides, runtimeContext, template]);

  const livePreviewCaseData = useMemo(
    () => buildPreviewCaseDataForRenderer(report),
    [report],
  );`;

  replaceOnce(marker, insertion);
}

/* 3) Replace iframe preview with admin-like active page preview */
const iframeBlock = `            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    المعاينة الرسمية
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                    بعد الحفظ يتم تحديث المعاينة بنفس التصميم النهائي.
                  </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                  يتم التحديث بعد الحفظ
                </span>
              </div>

              <iframe
                key={previewUrl}
                src={previewUrl}
                className="h-[calc(100vh-280px)] min-h-[760px] w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
                title="معاينة التقرير"
              />
            </section>`;

const adminLikePreviewBlock = `            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    المعاينة الرسمية للصفحة الحالية
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                    مثل معاينة الأدمن: اختر الصفحة وشاهدها مباشرة بدون تمرير طويل بين كل الصفحات.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  تحديث مباشر قبل الحفظ
                </span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {pages.map((page, index) => {
                  const active = page.id === activePageId;

                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setActivePageId(page.id)}
                      className={[
                        "rounded-2xl border px-4 py-2 text-xs font-black transition",
                        active
                          ? "border-emerald-600 bg-emerald-700 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white",
                      ].join(" ")}
                    >
                      {index + 1}. {page.title}
                    </button>
                  );
                })}
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-4">
                {livePreviewTemplate.pages.length ? (
                  <FinalReportDesignRenderer
                    template={livePreviewTemplate}
                    previewCaseData={livePreviewCaseData as any}
                    editorialBlocks={cleanBlockOverrides}
                    identity={{}}
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
                    لا توجد صفحة نشطة للمعاينة.
                  </div>
                )}
              </div>
            </section>`;

if (!replaceOnce(iframeBlock, adminLikePreviewBlock)) {
  console.log("تنبيه: لم أجد iframe block القديم. قد يكون تم تعديله يدويًا.");
}

/* 4) Do not fall back to old renderedContent because it may contain broken encoding */
content = content.replace(
  `if (!content) {
    return {
      blocks: renderedContent ? { fallbackIntro: renderedContent } : {},
      workflowValueOverrides: [],
      evidenceLayoutMode: "two-per-page",
    };
  }`,
  `if (!content) {
    return {
      blocks: {},
      workflowValueOverrides: [],
      evidenceLayoutMode: "two-per-page",
    };
  }`
);

content = content.replace(
  `return {
      blocks: renderedContent ? { fallbackIntro: renderedContent } : {},
      workflowValueOverrides: [],
      evidenceLayoutMode: "two-per-page",
    };`,
  `return {
      blocks: {},
      workflowValueOverrides: [],
      evidenceLayoutMode: "two-per-page",
    };`
);

/* 5) Make block keys stable so text does not go to the wrong block */
content = content.replace(
  `function getBlockKey(page: TemplatePage, block: TemplateBlock, index: number) {
  return String(block.id || \`\${page.id}__block_\${index + 1}\`);
}`,
  `function getBlockKey(page: TemplatePage, block: TemplateBlock, index: number) {
  if (block.id) {
    return String(block.id);
  }

  const title = getBlockTitle(block)
    .replace(/\\s+/g, "_")
    .replace(/[^A-Za-z0-9_\\u0600-\\u06FF-]/g, "");

  const kind = normalizeBlockKind(block);

  return String(\`\${page.id}__\${kind}__\${title || index + 1}\`);
}`
);

/* 6) Clean automatic block text and prevent mojibake display */
content = content.replace(
  `function getAutomaticBlockText(block: TemplateBlock, context: Record<string, string>) {
  const kind = normalizeBlockKind(block);
  const settings = block.settings || {};

  if (kind === "cover-title" || kind === "hero-title") {
    return renderText(block.content || settings.content || "{{case.title}}", context);
  }

  if (kind === "text-library") {
    return renderText(resolveTextLibraryFallback(block), context);
  }

  const content =
    block.content ||
    block.customContent ||
    settings.content ||
    block.defaultContent ||
    "";

  return renderText(content, context);
}`,
  `function getAutomaticBlockText(block: TemplateBlock, context: Record<string, string>) {
  const kind = normalizeBlockKind(block);
  const settings = block.settings || {};

  if (kind === "cover-title" || kind === "hero-title") {
    return renderText(
      repairArabicMojibake(block.content || settings.content || "{{case.title}}"),
      context,
    );
  }

  if (kind === "text-library") {
    return renderText(repairArabicMojibake(resolveTextLibraryFallback(block)), context);
  }

  const content =
    block.content ||
    block.customContent ||
    settings.content ||
    block.defaultContent ||
    "";

  return renderText(repairArabicMojibake(content), context);
}`
);

/* 7) Reduce noisy rendered preview below textarea */
content = content.replace(
  `                        <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-[11px] font-bold leading-6 text-slate-500">
                          المعاينة بالقيم الحالية:{" "}
                          <span className="text-slate-800">
                            {renderText(currentText, runtimeContext).slice(0, 220)}
                          </span>
                        </div>`,
  `                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-[11px] font-bold leading-6 text-slate-500">
                          <span>
                            يتم عرض هذا النص داخل البلوك المحدد فقط.
                          </span>

                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                            {currentText.trim() ? "جاهز للمعاينة" : "يستخدم النص التلقائي"}
                          </span>
                        </div>`
);

/* 8) Add live preview helpers before formatDate */
if (!content.includes("function buildLivePreviewPage")) {
  const helper = String.raw`
function buildLivePreviewPage({
  page,
  blocks,
  context,
}: {
  page?: TemplatePage;
  blocks: Record<string, string>;
  context: Record<string, string>;
}) {
  if (!page) {
    return null;
  }

  return {
    ...page,
    blocks: page.blocks.map((block, index) => {
      const blockKey = getBlockKey(page, block, index);
      const override = blocks[blockKey];
      const automaticText = getAutomaticBlockText(block, context);
      const content =
        override !== undefined
          ? repairArabicMojibake(override)
          : automaticText;

      return {
        ...block,
        content,
        customContent: content,
        settings: {
          ...(block.settings || {}),
          content,
        },
      };
    }),
  };
}

function buildPreviewCaseDataForRenderer(report: StudioReport) {
  const student = report.caseEntry.student;
  const snapshot = report.reportDataSnapshot || {};

  return {
    caseId: report.caseEntry.id,
    id: report.caseEntry.id,
    title: report.caseEntry.title || report.title,
    status: report.caseEntry.status,
    createdAt: report.caseEntry.createdAt,
    updatedAt: report.updatedAt,
    serviceName: report.caseEntry.service.name,
    serviceSlug: report.caseEntry.service.slug,
    student: {
      name: student?.fullName || "",
      fullName: student?.fullName || "",
      grade: student?.grade || "",
      classroom: student?.classroom || "",
      stage: student?.stage || "",
      guardianName: student?.guardianName || "",
      guardianPhone: student?.guardianPhone || "",
    },
    values: report.reportValues.map((item) => ({
      fieldKey: item.fieldKey,
      fieldLabel: item.fieldLabel,
      value: item.value,
    })),
    evidences: report.evidenceItems
      .filter((item) => item.visible)
      .map((item) => ({
        id: item.id,
        title: item.caption || item.fileName,
        caption: item.caption || item.fileName,
        fileUrl: item.fileUrl,
        imageUrl: item.fileUrl,
      })),
    snapshot,
  };
}

function repairArabicMojibake(value: string) {
  const text = String(value || "");

  if (!/[ØÙÃ]/.test(text)) {
    return text;
  }

  try {
    const bytes = new Uint8Array(
      Array.from(text).map((char) => char.charCodeAt(0) & 255),
    );

    const decoded = new TextDecoder("utf-8").decode(bytes);
    const originalArabic = (text.match(/[\\u0600-\\u06FF]/g) || []).length;
    const decodedArabic = (decoded.match(/[\\u0600-\\u06FF]/g) || []).length;

    return decodedArabic > originalArabic ? decoded : text;
  } catch {
    return text;
  }
}

`;

  content = content.replace("function formatDate", helper + "\nfunction formatDate");
}

/* 9) Make renderText clean text before replacing variables */
content = content.replace(
  `function renderText(text: string, context: Record<string, string>) {
  return String(text || "")`,
  `function renderText(text: string, context: Record<string, string>) {
  return repairArabicMojibake(String(text || ""))`
);

fs.writeFileSync(path, content, "utf8");

console.log("Report editor preview changed to admin-like page preview and block text binding fixed.");
