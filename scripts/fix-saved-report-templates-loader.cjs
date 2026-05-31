const fs = require("fs");

const path = "components/report-engine/report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

const start = content.indexOf("  useEffect(() => {\n    let isMounted = true;\n\n    async function loadSavedReportTemplates()");
const endMarker = "  useEffect(() => {\n    if (!activeTemplate) {";

if (start < 0) {
  throw new Error("لم أجد useEffect الخاص بتحميل القوالب المحفوظة.");
}

const end = content.indexOf(endMarker, start + 10);

if (end < 0) {
  throw new Error("لم أجد نهاية useEffect الخاص بتحميل القوالب.");
}

const newLoader = `  useEffect(() => {
    let isMounted = true;

    async function loadSavedReportTemplates() {
      try {
        const response = await fetch(
          "/api/dashboard/report-templates?includeInactive=true",
          {
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          return;
        }

        const savedTemplates = Array.isArray(result?.templates)
          ? result.templates
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result)
              ? result
              : [];

        const loadedTemplates = savedTemplates
          .map((item: any) => {
            const rawTemplate = item?.templateJson ?? item?.content;

            let parsedTemplate = rawTemplate;

            if (typeof rawTemplate === "string") {
              try {
                parsedTemplate = JSON.parse(rawTemplate);
              } catch {
                parsedTemplate = null;
              }
            }

            if (!parsedTemplate || typeof parsedTemplate !== "object") {
              parsedTemplate = {
                id: \`saved-template-\${item.id}\`,
                name: item.name || "قالب محفوظ",
                description:
                  item.description || "قالب محفوظ من قاعدة البيانات.",
                scope: item.serviceSlug ? "SERVICE" : "GLOBAL",
                serviceSlug: item.serviceSlug || undefined,
                status: "DRAFT",
                updatedAt: new Date().toISOString().slice(0, 10),
                previewCaseId: "",
                pages: [
                  createPageFromPreset("cover"),
                  createPageFromPreset("summary"),
                  createPageFromPreset("evidence"),
                  createPageFromPreset("approval"),
                ],
              };
            }

            return {
              ...parsedTemplate,
              id: \`saved-template-\${item.id}\`,
              name: item.name || parsedTemplate.name || "قالب محفوظ",
              description:
                item.description ||
                parsedTemplate.description ||
                "قالب محفوظ من قاعدة البيانات.",
              scope:
                parsedTemplate.scope ||
                (item.serviceSlug ? "SERVICE" : "GLOBAL"),
              serviceSlug: item.serviceSlug || parsedTemplate.serviceSlug,
              status: parsedTemplate.status || "DRAFT",
              updatedAt:
                item.updatedAt ||
                parsedTemplate.updatedAt ||
                new Date().toISOString().slice(0, 10),
            };
          })
          .filter(Boolean);

        if (!isMounted || loadedTemplates.length === 0) {
          return;
        }

        setTemplates((currentTemplates) => {
          const presetsOnly = currentTemplates.filter(
            (template) => !template.id.startsWith("saved-template-"),
          );

          return [...loadedTemplates, ...presetsOnly];
        });

        setSavedTemplateIds((current) => {
          const next = { ...current };

          savedTemplates.forEach((item: any) => {
            if (item?.id) {
              next[\`saved-template-\${item.id}\`] = item.id;
            }
          });

          return next;
        });

        setActiveTemplateId(loadedTemplates[0]?.id || "");
      } catch {
        // لا نوقف صانع القوالب إذا فشل تحميل القوالب المحفوظة.
      }
    }

    loadSavedReportTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

`;

content = content.slice(0, start) + newLoader + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح تحميل القوالب المحفوظة.");
