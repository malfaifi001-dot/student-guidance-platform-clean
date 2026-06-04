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

function removeNamedFunction(functionName) {
  const needle = "function " + functionName;
  const start = content.indexOf(needle);

  if (start === -1) {
    return false;
  }

  const braceStart = content.indexOf("{", start);

  if (braceStart === -1) {
    return false;
  }

  let depth = 0;
  let end = -1;

  for (let index = braceStart; index < content.length; index += 1) {
    const char = content[index];

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  if (end === -1) {
    return false;
  }

  while (content[end] === "\n" || content[end] === "\r") {
    end += 1;
  }

  content = content.slice(0, start) + content.slice(end);
  return true;
}

function removeEnclosingSectionByPhrase(phrase) {
  let safety = 0;

  while (content.includes(phrase) && safety < 10) {
    safety += 1;

    const phraseIndex = content.indexOf(phrase);
    const start = content.lastIndexOf("<section", phraseIndex);

    if (start === -1) {
      break;
    }

    const tokenRegex = /<\/?section\b[^>]*>/g;
    tokenRegex.lastIndex = start;

    let depth = 0;
    let end = -1;
    let match;

    while ((match = tokenRegex.exec(content)) !== null) {
      if (match[0].startsWith("</")) {
        depth -= 1;

        if (depth === 0) {
          end = tokenRegex.lastIndex;
          break;
        }
      } else {
        depth += 1;
      }
    }

    if (end === -1 || end <= start) {
      break;
    }

    content = content.slice(0, start) + "\n" + content.slice(end);
  }
}

/* 1) Ensure real design renderer import exists */
if (!content.includes("report-design-renderer")) {
  replaceOnce(
    'import { useEffect, useMemo, useState } from "react";',
    'import { useEffect, useMemo, useState } from "react";\nimport {\n  ReportDesignRenderer,\n  reportDesignTemplates,\n  type ReportDesignId,\n} from "@/components/report-engine/design-renderers/report-design-renderer";'
  );
}

if (
  content.includes("report-design-renderer") &&
  !content.includes("type ReportDesignId")
) {
  replaceOnce(
    "ReportDesignRenderer,\n  reportDesignTemplates,",
    "ReportDesignRenderer,\n  reportDesignTemplates,\n  type ReportDesignId,"
  );
}

/* 2) Ensure StudioTemplate stores only the new selected design id */
if (!content.includes("designTemplateId?: ReportDesignId;")) {
  if (
    !replaceOnce(
      "  status: TemplateStatus;\n  designTheme?: StudioDesignTheme;\n  scope: TemplateScope;",
      "  status: TemplateStatus;\n  designTemplateId?: ReportDesignId;\n  scope: TemplateScope;"
    )
  ) {
    replaceOnce(
      "  status: TemplateStatus;\n  scope: TemplateScope;",
      "  status: TemplateStatus;\n  designTemplateId?: ReportDesignId;\n  scope: TemplateScope;"
    );
  }
}

/* 3) Remove legacy designTheme type and options */
content = content.replace(
  /\n?type StudioDesignTheme\s*=\s*[\s\S]*?;\n/g,
  "\n"
);

content = content.replace(
  /\n?const designThemeOptions:[\s\S]*?\nconst pageKindLabels/g,
  "\nconst pageKindLabels"
);

content = content.replace(
  /\n\s*designTheme\?: StudioDesignTheme;/g,
  ""
);

/* 4) Remove old theme picker sections */
removeEnclosingSectionByPhrase("تصميم الصفحة الرسمي");
removeEnclosingSectionByPhrase("شريط التصاميم السريع");

/* 5) Remove old color-theme helper if still present */
removeNamedFunction("getDesignThemePalette");

content = content.replace(
  /\n?const theme = getDesignThemePalette\("MINISTRY_CLASSIC"\);\n/g,
  "\n"
);

/* 6) Remove legacy designTheme assignments */
content = content.replace(
  /\n\s*designTheme:\s*"MINISTRY_CLASSIC",/g,
  ""
);

content = content.replace(
  /\n\s*designTheme:\s*template\.designTheme\s*\|\|\s*"MINISTRY_CLASSIC",/g,
  ""
);

content = content.replace(
  /\n\s*designTheme:\s*templateJson\.designTheme\s*\|\|\s*smartStudio\.designTheme\s*\|\|\s*"MINISTRY_CLASSIC",/g,
  ""
);

content = content.replace(
  /\n\s*designTheme:\s*\n\s*templateJson\.designTheme\s*\|\|\s*\n\s*smartStudio\.designTheme\s*\|\|\s*\n\s*"MINISTRY_CLASSIC",/g,
  ""
);

/* 7) Ensure default designTemplateId exists */
if (!content.includes('designTemplateId: "ministry-form"')) {
  replaceOnce(
    '    status: "DRAFT",\n    scope: "GLOBAL",',
    '    status: "DRAFT",\n    designTemplateId: "ministry-form",\n    scope: "GLOBAL",'
  );
}

/* 8) Ensure saved templates hydrate designTemplateId */
if (!content.includes("designTemplateId: templateJson.designTemplateId")) {
  replaceOnce(
    '    id: templateJson.id || item?.id || fallback.id,\n    name:',
    '    id: templateJson.id || item?.id || fallback.id,\n    designTemplateId:\n      templateJson.designTemplateId ||\n      smartStudio.designTemplateId ||\n      "ministry-form",\n    name:'
  );
}

/* 9) Ensure saving designTemplateId at top level and inside smartStudio */
if (!content.includes('designTemplateId: template.designTemplateId || "ministry-form"')) {
  replaceOnce(
    '      documentType: template.documentType,\n      designPreset:',
    '      documentType: template.documentType,\n      designTemplateId: template.designTemplateId || "ministry-form",\n      designPreset:'
  );

  replaceOnce(
    '        mode: "multi-page-workflow-aware",\n        pages: template.pages,',
    '        mode: "multi-page-workflow-aware",\n        designTemplateId: template.designTemplateId || "ministry-form",\n        pages: template.pages,'
  );
}

/* 10) Ensure OfficialPagePreview delegates to ReportDesignRenderer */
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

/* 11) Ensure there is a button to raw designs gallery */
if (!content.includes('href="/dashboard/admin/report-templates/designs"')) {
  const libraryButton =
`            <a
              href="/dashboard/admin/report-templates/library"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              مكتبة القوالب
            </a>`;

  const replacement =
`            <a
              href="/dashboard/admin/report-templates/designs"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100"
            >
              معرض التصاميم
            </a>

${libraryButton}`;

  replaceOnce(libraryButton, replacement);
}

/* 12) Ensure selected design can be opened from:
   /dashboard/admin/report-templates?designTemplateId=...
*/
if (!content.includes('params.get("designTemplateId")')) {
  const marker =
    "const activePage = template.pages.find((page) => page.id === activePageId) || template.pages[0];";

  const insertion =
`const activePage = template.pages.find((page) => page.id === activePageId) || template.pages[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const designTemplateId = params.get("designTemplateId") as ReportDesignId | null;

    if (!designTemplateId) {
      return;
    }

    const exists = reportDesignTemplates.some(
      (design) => design.id === designTemplateId,
    );

    if (!exists) {
      return;
    }

    updateTemplate({
      designTemplateId,
    });

    window.history.replaceState({}, "", window.location.pathname);
  }, []);`;

  replaceOnce(marker, insertion);
}

fs.writeFileSync(path, content, "utf8");

const remainingLegacy = [
  "StudioDesignTheme",
  "designThemeOptions",
  "getDesignThemePalette",
  "شريط التصاميم السريع",
  "تصميم الصفحة الرسمي",
].filter((item) => content.includes(item));

if (remainingLegacy.length) {
  console.log("تنبيه: بقيت مراجع قديمة تحتاج مراجعة لاحقة:", remainingLegacy.join(", "));
} else {
  console.log("تم تنظيف مراجع designTheme القديمة واعتماد designTemplateId.");
}
