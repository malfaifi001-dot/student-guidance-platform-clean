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

/* 1) Types */
if (!content.includes('| "evidence-gallery"')) {
  replaceOnce(
    '  | "dynamic-fields"\n  | "closing-note";',
    '  | "dynamic-fields"\n  | "evidence-gallery"\n  | "closing-note";'
  );
}

if (!content.includes("type EvidenceLayout")) {
  replaceOnce(
    'type TextSource = "manual" | "library" | "workflow";',
    'type TextSource = "manual" | "library" | "workflow";\n\ntype EvidenceLayout = "ONE_PER_PAGE" | "TWO_PER_PAGE" | "GRID_2X2" | "ATTACHMENT_LIST";\ntype EvidenceFit = "contain" | "cover";\ntype EvidenceEmptyBehavior = "hide" | "message";'
  );
}

if (!content.includes("evidenceLayout?: EvidenceLayout;")) {
  replaceOnce(
    '  placement: BlockPlacement;\n};',
    '  placement: BlockPlacement;\n  evidenceLayout?: EvidenceLayout;\n  evidenceFit?: EvidenceFit;\n  evidenceShowCaptions?: boolean;\n  evidenceAutoCreatePages?: boolean;\n  evidenceEmptyBehavior?: EvidenceEmptyBehavior;\n  evidenceStartIndex?: number;\n};'
  );
}

/* 2) Block library */
if (!content.includes('kind: "evidence-gallery"')) {
  replaceOnce(
    '  {\n    kind: "closing-note",\n    title: "خاتمة واعتماد",',
    '  {\n    kind: "evidence-gallery",\n    title: "الشواهد والمرفقات",\n    description: "يعرض الشواهد المرتبطة بالحالة. إذا زادت الشواهد عن سعة الصفحة يتم إنشاء صفحات إضافية.",\n    defaultContent:\n      "يعرض هذا البلوك الشواهد المرتبطة بـ Case ID. لا تظهر الشواهد إلا إذا أضفت هذا البلوك.",\n    defaultVariant: "card",\n  },\n  {\n    kind: "closing-note",\n    title: "خاتمة واعتماد",'
  );
}

/* 3) Evidence page creates evidence block */
content = content.replace(
  'description: "صفحة تمهيدية للشواهد. تنظيم الصور الفعلي سيتم في إعدادات الشواهد لاحقًا.",\n      blockKinds: ["section-text"],',
  'description: "صفحة مستقلة لعرض الشواهد وتقسيمها تلقائيًا على صفحات A4 عند كثرتها.",\n      blockKinds: ["evidence-gallery"],'
);

/* 4) Defaults */
if (!content.includes('evidenceLayout: item.kind === "evidence-gallery"')) {
  replaceRegex(
    /placement: item\.kind === "hero-title" \? "[^"]+" : "flow",/,
    'placement: item.kind === "hero-title" ? "middle-center" : "flow",\n    evidenceLayout: item.kind === "evidence-gallery" ? "TWO_PER_PAGE" : undefined,\n    evidenceFit: item.kind === "evidence-gallery" ? "contain" : undefined,\n    evidenceShowCaptions: item.kind === "evidence-gallery" ? true : undefined,\n    evidenceAutoCreatePages: item.kind === "evidence-gallery" ? true : undefined,\n    evidenceEmptyBehavior: item.kind === "evidence-gallery" ? "message" : undefined,'
  );
}

/* 5) Hydrate saved template */
if (!content.includes("evidenceLayout: block.settings?.evidenceLayout")) {
  replaceOnce(
    '                  placement: block.settings?.placement || "flow",\n                }))',
    '                  placement: block.settings?.placement || "flow",\n                  evidenceLayout: block.settings?.evidenceLayout || undefined,\n                  evidenceFit: block.settings?.evidenceFit || undefined,\n                  evidenceShowCaptions: block.settings?.evidenceShowCaptions !== false,\n                  evidenceAutoCreatePages: block.settings?.evidenceAutoCreatePages !== false,\n                  evidenceEmptyBehavior: block.settings?.evidenceEmptyBehavior || "message",\n                }))'
  );
}

/* 6) Save settings */
if (!content.includes("evidenceLayout: block.evidenceLayout")) {
  replaceOnce(
    '            align: block.align,\n            snippetId: block.snippetId || null,',
    '            align: block.align,\n            placement: block.placement || "flow",\n            evidenceLayout: block.evidenceLayout || null,\n            evidenceFit: block.evidenceFit || null,\n            evidenceShowCaptions: block.evidenceShowCaptions !== false,\n            evidenceAutoCreatePages: block.evidenceAutoCreatePages !== false,\n            evidenceEmptyBehavior: block.evidenceEmptyBehavior || "message",\n            snippetId: block.snippetId || null,'
  );
}

/* 7) UI settings */
if (!content.includes("إعدادات عرض الشواهد")) {
  const marker = '                <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-bold leading-6 text-emerald-800">\n                  المتغيرات العامة:';
  const evidenceSettings = String.raw`                {selectedBlock.kind === "evidence-gallery" ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-black text-emerald-900">
                      إعدادات عرض الشواهد
                    </p>

                    <p className="mt-1 text-[11px] font-bold leading-6 text-emerald-800">
                      القالب هو الذي يقرر كيف تظهر الشواهد. إذا زاد عدد الشواهد
                      عن سعة الصفحة، يتم إنشاء صفحات شواهد إضافية تلقائيًا.
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-xs font-black text-slate-500">
                          طريقة العرض
                        </span>

                        <select
                          value={selectedBlock.evidenceLayout || "TWO_PER_PAGE"}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceLayout: event.target.value as EvidenceLayout,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                        >
                          <option value="ONE_PER_PAGE">شاهد واحد في الصفحة</option>
                          <option value="TWO_PER_PAGE">شاهدان في الصفحة</option>
                          <option value="GRID_2X2">4 شواهد في الصفحة</option>
                          <option value="ATTACHMENT_LIST">قائمة مرفقات فقط</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-500">
                          عرض الصورة
                        </span>

                        <select
                          value={selectedBlock.evidenceFit || "contain"}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceFit: event.target.value as EvidenceFit,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                        >
                          <option value="contain">احتواء كامل</option>
                          <option value="cover">تعبئة الإطار</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedBlock.evidenceAutoCreatePages !== false}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceAutoCreatePages: event.target.checked,
                            }))
                          }
                        />
                        إنشاء صفحات إضافية تلقائيًا عند زيادة عدد الشواهد
                      </label>

                      <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedBlock.evidenceShowCaptions !== false}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceShowCaptions: event.target.checked,
                            }))
                          }
                        />
                        إظهار التعليقات وأسماء الشواهد
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-500">
                          إذا لا توجد شواهد
                        </span>

                        <select
                          value={selectedBlock.evidenceEmptyBehavior || "message"}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceEmptyBehavior: event.target.value as EvidenceEmptyBehavior,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                        >
                          <option value="message">إظهار رسالة لا توجد شواهد</option>
                          <option value="hide">إخفاء البلوك بالكامل</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}

`;
  content = content.replace(marker, evidenceSettings + marker);
}

/* 8) Auto evidence pages after the active A4 page */
if (!content.includes("function AutoEvidencePages")) {
  replaceOnce(
    '      </article>\n    </section>\n  );\n}\n\nfunction PreviewBlock',
    String.raw`      </article>

      <AutoEvidencePages
        activePage={activePage}
        context={context}
        previewCase={previewCase}
      />
    </section>
  );
}

function AutoEvidencePages({
  activePage,
  context,
  previewCase,
}: {
  activePage?: StudioPage;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
}) {
  const evidenceBlock = activePage?.blocks.find(
    (block) => block.kind === "evidence-gallery",
  );

  if (!activePage || !evidenceBlock) {
    return null;
  }

  if (evidenceBlock.evidenceAutoCreatePages === false) {
    return null;
  }

  const evidences = previewCase?.evidences || [];
  const perPage = getEvidencePerPage(evidenceBlock);
  const pagesCount = Math.ceil(evidences.length / perPage);

  if (pagesCount <= 1) {
    return null;
  }

  return (
    <div className="mt-6 space-y-6">
      {Array.from({ length: pagesCount - 1 }).map((_, index) => {
        const pageNumber = index + 2;
        const virtualBlock: StudioBlock = {
          ...evidenceBlock,
          id: evidenceBlock.id + "-auto-page-" + pageNumber,
          title: evidenceBlock.title + " - صفحة " + pageNumber,
          evidenceStartIndex: (pageNumber - 1) * perPage,
        };

        return (
          <article
            key={"auto-evidence-page-" + pageNumber}
            className="mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[28px] border border-emerald-100 bg-[#f1faf5] p-[9mm] shadow-xl"
          >
            <div className="relative min-h-[279mm] rounded-[24px] border border-emerald-100 bg-white p-[12mm]">
              <div className="pointer-events-none absolute inset-4 rounded-[22px] border border-emerald-50" />

              <header className="relative z-10 rounded-[22px] border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-5">
                <div className="grid grid-cols-[150px_1fr_150px] items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-100 bg-white p-2">
                    <img
                      src="/uploads/school-logos/MOE.png"
                      alt="شعار وزارة التعليم"
                      className="max-h-full max-w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-black text-emerald-900">
                      وزارة التعليم
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      الإدارة العامة للتعليم · مكتب التعليم
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      اسم المدرسة
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-white p-3 text-center">
                    <p className="text-[10px] font-black text-slate-400">
                      صفحة شواهد
                    </p>
                    <p className="mt-1 text-sm font-black text-emerald-800">
                      {pageNumber}
                    </p>
                  </div>
                </div>
              </header>

              <main className="relative z-10 mt-6 min-h-[190mm]">
                <PreviewBlock
                  block={virtualBlock}
                  context={context}
                  previewCase={previewCase}
                />
              </main>

              <footer className="absolute bottom-[10mm] left-[12mm] right-[12mm] z-10">
                <div className="h-1 rounded-full bg-gradient-to-l from-emerald-700 to-emerald-200" />
                <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>منصة التوجيه الطلابي</span>
                  <span>تقرير رسمي ذكي · شواهد إضافية</span>
                </div>
              </footer>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PreviewBlock`
  );
}

/* 9) Evidence rendering */
if (!content.includes('block.kind === "evidence-gallery"')) {
  replaceOnce(
    '  if (block.kind === "closing-note") {',
    String.raw`  if (block.kind === "evidence-gallery") {
    const evidences = previewCase?.evidences || [];
    const perPage = getEvidencePerPage(block);
    const startIndex = block.evidenceStartIndex || 0;
    const visibleEvidences = evidences.slice(startIndex, startIndex + perPage);
    const hiddenCount = Math.max(evidences.length - (startIndex + perPage), 0);

    if (!visibleEvidences.length && block.evidenceEmptyBehavior === "hide") {
      return null;
    }

    if (block.evidenceLayout === "ATTACHMENT_LIST") {
      return (
        <section className={getBlockClass(block.variant, textAlign)}>
          {block.showTitle ? <BlockTitle title={block.title} /> : null}

          {visibleEvidences.length ? (
            <div className="space-y-2">
              {visibleEvidences.map((evidence, index) => (
                <div
                  key={evidence.id || evidence.fileUrl || String(index)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                >
                  <span>
                    {evidence.caption || evidence.title || "مرفق " + (startIndex + index + 1)}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                    شاهد
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyEvidenceMessage />
          )}
        </section>
      );
    }

    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}

        {visibleEvidences.length ? (
          <>
            <div className={getEvidenceGridClass(block)}>
              {visibleEvidences.map((evidence, index) => {
                const imageUrl = evidence.imageUrl || evidence.fileUrl || "";

                return (
                  <figure
                    key={evidence.id || imageUrl || String(index)}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={evidence.title || "شاهد " + (startIndex + index + 1)}
                        className={getEvidenceImageClass(block) + " bg-slate-50"}
                      />
                    ) : (
                      <div className={getEvidenceImageHeightClass(block) + " flex w-full items-center justify-center bg-slate-50 text-xs font-black text-slate-400"}>
                        شاهد بدون صورة
                      </div>
                    )}

                    {block.evidenceShowCaptions !== false ? (
                      <figcaption className="border-t border-slate-100 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                        {evidence.caption || evidence.title || "شاهد " + (startIndex + index + 1)}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>

            {hiddenCount > 0 && block.evidenceAutoCreatePages === false ? (
              <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                يوجد {hiddenCount} شاهد إضافي لم يظهر لأن إنشاء الصفحات التلقائية غير مفعل.
              </p>
            ) : null}
          </>
        ) : (
          <EmptyEvidenceMessage />
        )}
      </section>
    );
  }

  if (block.kind === "closing-note") {`
  );
}

/* 10) Helpers */
if (!content.includes("function getEvidencePerPage")) {
  replaceOnce(
    'function BlockTitle({ title }: { title: string }) {',
    String.raw`function getEvidencePerPage(block: StudioBlock) {
  if (block.evidenceLayout === "ONE_PER_PAGE") return 1;
  if (block.evidenceLayout === "GRID_2X2") return 4;
  if (block.evidenceLayout === "ATTACHMENT_LIST") return 8;

  return 2;
}

function getEvidenceGridClass(block: StudioBlock) {
  if (block.evidenceLayout === "ONE_PER_PAGE") {
    return "grid gap-3";
  }

  return "grid gap-3 md:grid-cols-2";
}

function getEvidenceImageHeightClass(block: StudioBlock) {
  if (block.evidenceLayout === "ONE_PER_PAGE") return "h-[122mm]";
  if (block.evidenceLayout === "GRID_2X2") return "h-36";

  return "h-48";
}

function getEvidenceImageClass(block: StudioBlock) {
  const fit = block.evidenceFit === "cover" ? "object-cover" : "object-contain";

  return getEvidenceImageHeightClass(block) + " w-full " + fit;
}

function EmptyEvidenceMessage() {
  return (
    <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
      <p className="text-sm font-black text-emerald-800">
        لا توجد شواهد مرتبطة بالـ Case ID الحالي
      </p>

      <p className="mt-2 text-xs font-bold leading-6 text-emerald-700">
        هذا البلوك لن يعرض أي مرفقات في التقرير النهائي إلا إذا كانت الحالة تحتوي على شواهد.
      </p>
    </div>
  );
}

function BlockTitle({ title }: { title: string }) {`
  );
}

fs.writeFileSync(path, content, "utf8");
console.log("Evidence patch completed.");
