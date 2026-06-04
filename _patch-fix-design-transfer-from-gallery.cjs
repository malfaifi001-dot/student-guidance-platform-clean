const fs = require("fs");

const galleryPath = "components\\report-engine\\design-renderers\\report-design-gallery-preview.tsx";
const studioPath = "components\\report-engine\\report-template-studio.tsx";

let gallery = fs.readFileSync(galleryPath, "utf8");
let studio = fs.readFileSync(studioPath, "utf8");

/* 1) معرض التصاميم: خزّن التصميم المختار قبل فتح الاستديو */
if (!gallery.includes("student-guidance-selected-report-design")) {
  gallery = gallery.replaceAll(
    'href={`/dashboard/admin/report-templates?designTemplateId=${selectedDesignId}`}',
    `href={\`/dashboard/admin/report-templates?designTemplateId=\${selectedDesignId}&fromDesignGallery=1\`}
              onClick={() => {
                window.sessionStorage.setItem(
                  "student-guidance-selected-report-design",
                  selectedDesignId,
                );
              }}`
  );
}

/* 2) الاستديو: تأكد من import النوع إن كان ناقصًا */
if (
  studio.includes("report-design-renderer") &&
  !studio.includes("type ReportDesignId")
) {
  studio = studio.replace(
    "ReportDesignRenderer,\n  reportDesignTemplates,",
    "ReportDesignRenderer,\n  reportDesignTemplates,\n  type ReportDesignId,"
  );
}

/* 3) الاستديو: التقط التصميم من الرابط أو sessionStorage وطبقه بقوة */
if (!studio.includes("student-guidance-selected-report-design")) {
  const marker =
    "const activePage = template.pages.find((page) => page.id === activePageId) || template.pages[0];";

  const insertion = `const activePage = template.pages.find((page) => page.id === activePageId) || template.pages[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("designTemplateId");
    const fromStorage = window.sessionStorage.getItem(
      "student-guidance-selected-report-design",
    );

    const requestedDesignTemplateId = (fromQuery || fromStorage) as ReportDesignId | null;

    if (!requestedDesignTemplateId) {
      return;
    }

    const exists = reportDesignTemplates.some(
      (design) => design.id === requestedDesignTemplateId,
    );

    if (!exists) {
      window.sessionStorage.removeItem("student-guidance-selected-report-design");
      return;
    }

    const applyDesign = () => {
      updateTemplate({
        designTemplateId: requestedDesignTemplateId,
      });
    };

    applyDesign();

    const timers = [
      window.setTimeout(applyDesign, 100),
      window.setTimeout(applyDesign, 350),
      window.setTimeout(applyDesign, 800),
    ];

    window.sessionStorage.removeItem("student-guidance-selected-report-design");

    params.delete("designTemplateId");
    params.delete("fromDesignGallery");

    const nextQuery = params.toString();

    window.history.replaceState(
      {},
      "",
      window.location.pathname + (nextQuery ? \`?\${nextQuery}\` : ""),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);`;

  if (studio.includes(marker)) {
    studio = studio.replace(marker, insertion);
  } else {
    throw new Error("لم أجد مكان activePage لإضافة التقاط التصميم من الرابط.");
  }
}

/* 4) الاستديو: عند الحفظ لا يسقط designTemplateId */
if (!studio.includes('designTemplateId: template.designTemplateId || "ministry-form"')) {
  studio = studio.replace(
    '      documentType: template.documentType,\n      designPreset:',
    '      documentType: template.documentType,\n      designTemplateId: template.designTemplateId || "ministry-form",\n      designPreset:'
  );

  studio = studio.replace(
    '        mode: "multi-page-workflow-aware",\n        pages: template.pages,',
    '        mode: "multi-page-workflow-aware",\n        designTemplateId: template.designTemplateId || "ministry-form",\n        pages: template.pages,'
  );
}

fs.writeFileSync(galleryPath, gallery, "utf8");
fs.writeFileSync(studioPath, studio, "utf8");

console.log("Design transfer from raw gallery to studio fixed.");
