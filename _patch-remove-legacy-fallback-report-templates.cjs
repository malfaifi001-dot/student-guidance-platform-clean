const fs = require("fs");

const path = "components\\reports\\new-report-case-picker.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  Remove legacy fallback report templates:
  official-long / visual-activity / executive-brief
*/

content = content.replace(
/const FALLBACK_TEMPLATE_CHOICES:[\s\S]*?\];\s*\n\s*type NewReportCasePickerProps/,
"type NewReportCasePickerProps"
);

content = content.replace(
/const templateChoices = useMemo<ReportTemplateChoice\[\]>\(\(\) => \{[\s\S]*?\n  \}, \[publishedTemplates\]\);/,
`const templateChoices = useMemo<ReportTemplateChoice[]>(() => {
    return publishedTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description:
        template.description || "قالب منشور من صانع قوالب التقارير.",
      bestFor:
        template.scope === "SERVICE"
          ? "هذا القالب مخصص لخدمة محددة."
          : "قالب عام مناسب لأكثر من خدمة.",
      badge: template.scope === "SERVICE" ? "خدمة" : "عام",
      serviceSlug: template.serviceSlug,
      pagesCount: template.pagesCount,
      isBuilderTemplate: true,
    }));
  }, [publishedTemplates]);`
);

content = content.replace(
/const allTemplateChoices = useMemo<ReportTemplateChoice\[\]>\(\(\) => \{[\s\S]*?\n  \}, \[publishedTemplates\]\);/,
`const allTemplateChoices = useMemo<ReportTemplateChoice[]>(() => {
    return publishedTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description:
        template.description || "قالب منشور من صانع قوالب التقارير.",
      bestFor:
        template.scope === "SERVICE"
          ? "هذا القالب مخصص لخدمة محددة."
          : "قالب عام مناسب لأكثر من خدمة.",
      badge: template.scope === "SERVICE" ? "خدمة" : "عام",
      serviceSlug: template.serviceSlug,
      pagesCount: template.pagesCount,
      isBuilderTemplate: true,
    }));
  }, [publishedTemplates]);`
);

content = content.replace(
/const \[selectedTemplateId, setSelectedTemplateId\] = useState<string>\(\s*publishedTemplates\[0\]\?\.id \|\| "official-long"\s*\);/,
`const [selectedTemplateId, setSelectedTemplateId] = useState("");`
);

content = content.replace(
/const \[selectedTemplateId, setSelectedTemplateId\] = useState\(\s*publishedTemplates\[0\]\?\.id \|\| "official-long"\s*\);/,
`const [selectedTemplateId, setSelectedTemplateId] = useState("");`
);

content = content.replaceAll(
"القالب الرسمي",
"قالب منشور"
);

content = content.replaceAll(
"القالب البصري",
"قالب منشور"
);

content = content.replaceAll(
"القالب المختصر",
"قالب منشور"
);

fs.writeFileSync(path, content, "utf8");
console.log("Legacy fallback templates removed from new report flow.");
