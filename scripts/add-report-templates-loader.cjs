const fs = require("fs");

const path = "components/report-engine/report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

if (content.includes("async function loadSavedReportTemplates()")) {
  console.log("Loader موجود مسبقًا، لن يتم تكراره.");
  process.exit(0);
}

const marker = `  const activeTemplate = useMemo(() => {
    return templates.find((template) => template.id === activeTemplateId);
  }, [templates, activeTemplateId]);

`;

if (!content.includes(marker)) {
  throw new Error("لم أجد مكان activeTemplate useMemo لإضافة Loader.");
}

const loader = `  const activeTemplate = useMemo(() => {
    return templates.find((template) => template.id === activeTemplateId);
  }, [templates, activeTemplateId]);

  useEffect(() => {
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
          .filter(Boolean) as ReportTemplateBuilderModel[];

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

content = content.replace(marker, loader);

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة Loader جديد للقوالب المحفوظة.");
