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

/* 1) Add evidence aspect ratio type */
if (!content.includes("type EvidenceAspectRatio")) {
  if (
    !replaceOnce(
      'type EvidenceEmptyBehavior = "hide" | "message";',
      'type EvidenceEmptyBehavior = "hide" | "message";\ntype EvidenceAspectRatio = "LANDSCAPE_4_3" | "LANDSCAPE_16_9" | "PORTRAIT_3_4" | "SQUARE_1_1";'
    )
  ) {
    replaceOnce(
      'type TextSource = "manual" | "library" | "workflow";',
      'type TextSource = "manual" | "library" | "workflow";\n\ntype EvidenceLayout = "ONE_PER_PAGE" | "TWO_PER_PAGE" | "GRID_2X2" | "ATTACHMENT_LIST";\ntype EvidenceFit = "contain" | "cover";\ntype EvidenceEmptyBehavior = "hide" | "message";\ntype EvidenceAspectRatio = "LANDSCAPE_4_3" | "LANDSCAPE_16_9" | "PORTRAIT_3_4" | "SQUARE_1_1";'
    );
  }
}

/* 2) Add aspect ratio to StudioBlock */
if (!content.includes("evidenceAspectRatio?: EvidenceAspectRatio;")) {
  replaceOnce(
    '  evidenceFit?: EvidenceFit;\n  evidenceShowCaptions?: boolean;',
    '  evidenceFit?: EvidenceFit;\n  evidenceAspectRatio?: EvidenceAspectRatio;\n  evidenceShowCaptions?: boolean;'
  );
}

/* 3) Default aspect ratio */
if (!content.includes('evidenceAspectRatio: item.kind === "evidence-gallery"')) {
  replaceOnce(
    '    evidenceFit: item.kind === "evidence-gallery" ? "contain" : undefined,\n    evidenceShowCaptions:',
    '    evidenceFit: item.kind === "evidence-gallery" ? "contain" : undefined,\n    evidenceAspectRatio: item.kind === "evidence-gallery" ? "LANDSCAPE_4_3" : undefined,\n    evidenceShowCaptions:'
  );
}

/* 4) Save aspect ratio */
if (!content.includes("evidenceAspectRatio: block.evidenceAspectRatio")) {
  replaceOnce(
    '            evidenceFit: block.evidenceFit || null,\n            evidenceShowCaptions:',
    '            evidenceFit: block.evidenceFit || null,\n            evidenceAspectRatio: block.evidenceAspectRatio || "LANDSCAPE_4_3",\n            evidenceShowCaptions:'
  );
}

/* 5) Hydrate aspect ratio from saved templates */
if (!content.includes("evidenceAspectRatio: block.settings?.evidenceAspectRatio")) {
  replaceOnce(
    '                  evidenceFit: block.settings?.evidenceFit || undefined,\n                  evidenceShowCaptions:',
    '                  evidenceFit: block.settings?.evidenceFit || undefined,\n                  evidenceAspectRatio: block.settings?.evidenceAspectRatio || "LANDSCAPE_4_3",\n                  evidenceShowCaptions:'
  );
}

/* 6) Add aspect ratio control in Evidence Settings UI */
if (!content.includes("أبعاد الصورة المتوقعة")) {
  const marker =
`                    </div>

                    <div className="mt-3 grid gap-2">`;

  const insert =
`                    </div>

                    <label className="mt-3 block">
                      <span className="text-xs font-black text-slate-500">
                        أبعاد الصورة المتوقعة
                      </span>

                      <select
                        value={selectedBlock.evidenceAspectRatio || "LANDSCAPE_4_3"}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            evidenceAspectRatio: event.target.value as EvidenceAspectRatio,
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                      >
                        <option value="LANDSCAPE_4_3">أفقي 4:3 - تصوير عادي</option>
                        <option value="LANDSCAPE_16_9">أفقي عريض 16:9</option>
                        <option value="PORTRAIT_3_4">طولي 3:4</option>
                        <option value="SQUARE_1_1">مربع 1:1</option>
                      </select>

                      <p className="mt-2 text-[11px] font-bold leading-6 text-slate-500">
                        هذا لا يجبر الموجه على قص الصورة، لكنه يحدد مساحة عرض الشاهد داخل التقرير حتى تظهر المعاينة بنفس تصورك.
                      </p>
                    </label>

                    <div className="mt-3 grid gap-2">`;

  replaceOnce(marker, insert);
}

/* 7) Evidence aspect ratio classes */
if (!content.includes("function getEvidenceAspectRatioClass")) {
  const helper =
`
function getEvidenceAspectRatioClass(block: StudioBlock) {
  switch (block.evidenceAspectRatio || "LANDSCAPE_4_3") {
    case "LANDSCAPE_16_9":
      return "aspect-video";
    case "PORTRAIT_3_4":
      return "aspect-[3/4]";
    case "SQUARE_1_1":
      return "aspect-square";
    case "LANDSCAPE_4_3":
    default:
      return "aspect-[4/3]";
  }
}

`;

  if (content.includes("function getEvidenceImageHeightClass")) {
    content = content.replace("function getEvidenceImageHeightClass", helper + "function getEvidenceImageHeightClass");
  } else if (content.includes("function BlockTitle")) {
    content = content.replace("function BlockTitle", helper + "function BlockTitle");
  } else {
    content += helper;
  }
}

/* 8) Replace fixed evidence heights with selected aspect ratio */
replaceRegex(
  /function getEvidenceImageHeightClass\(block: StudioBlock\) \{[\s\S]*?\n\}/,
`function getEvidenceImageHeightClass(block: StudioBlock) {
  return getEvidenceAspectRatioClass(block);
}`
);

/* 9) Clean Ministry logo box in all preview headers */
content = content.replaceAll(
  'className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-100 bg-white p-2"',
  'className="flex h-20 w-28 items-center justify-center p-0"'
);

content = content.replaceAll(
  'className="max-h-full max-w-full object-contain"',
  'className="h-16 w-auto object-contain"'
);

/* 10) Improve evidence placeholder label */
content = content.replaceAll(
  "مربع شاهد للمعاينة",
  "مساحة شاهد للمعاينة"
);

fs.writeFileSync(path, content, "utf8");
console.log("Evidence aspect ratio and logo cleanup patch completed.");
