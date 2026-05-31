const fs = require("fs");

const path = "components/reports/new-report-case-picker.tsx";
let content = fs.readFileSync(path, "utf8");

// 1) Replace template types
content = content.replace(
  /type ReportTemplateId = "official-long" \| "visual-activity" \| "executive-brief";\s*type ReportTemplateChoice = \{[\s\S]*?\};/,
  `type ReportTemplateChoice = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  badge: string;
  serviceSlug?: string | null;
  pagesCount?: number;
  isBuilderTemplate?: boolean;
};

type PublishedReportTemplateOption = {
  id: string;
  name: string;
  description: string;
  serviceSlug: string | null;
  scope: "GLOBAL" | "SERVICE";
  status: "PUBLISHED" | string;
  pagesCount: number;
};`
);

// 2) Replace props type
content = content.replace(
  /type NewReportCasePickerProps = \{\s*cases: ReportCaseListItem\[\];\s*initialCaseId\?: string;\s*\};/,
  `type NewReportCasePickerProps = {
  cases: ReportCaseListItem[];
  initialCaseId?: string;
  publishedTemplates?: PublishedReportTemplateOption[];
};`
);

// 3) Replace component props destructuring
content = content.replace(
  /export function NewReportCasePicker\(\{\s*cases,\s*initialCaseId = "",\s*\}: NewReportCasePickerProps\) \{/,
  `export function NewReportCasePicker({
  cases,
  initialCaseId = "",
  publishedTemplates = [],
}: NewReportCasePickerProps) {`
);

// 4) Replace selectedTemplateId state
content = content.replace(
  /const \[selectedTemplateId, setSelectedTemplateId\] =\s*useState<ReportTemplateId>\("official-long"\);/,
  `const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    publishedTemplates[0]?.id || "official-long"
  );`
);

// 5) Replace selectedTemplate useMemo with builder-aware choices
content = content.replace(
  /const selectedTemplate = useMemo\(\(\) => \{\s*return \(\s*REPORT_TEMPLATE_CHOICES\.find\(\s*\(template\) => template\.id === selectedTemplateId\s*\) \|\| REPORT_TEMPLATE_CHOICES\[0\]\s*\);\s*\}, \[selectedTemplateId\]\);/,
  `const templateChoices = useMemo<ReportTemplateChoice[]>(() => {
    if (publishedTemplates.length > 0) {
      return publishedTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        description:
          template.description || "قالب منشور من صانع قوالب التقارير.",
        bestFor:
          template.scope === "SERVICE"
            ? "تقارير الخدمة المرتبطة بهذا القالب"
            : "التقارير العامة لكل الخدمات",
        badge: template.scope === "SERVICE" ? "قالب خدمة" : "قالب عام",
        serviceSlug: template.serviceSlug,
        pagesCount: template.pagesCount,
        isBuilderTemplate: true,
      }));
    }

    return REPORT_TEMPLATE_CHOICES;
  }, [publishedTemplates]);

  const selectedTemplate = useMemo(() => {
    return (
      templateChoices.find((template) => template.id === selectedTemplateId) ||
      templateChoices[0] ||
      REPORT_TEMPLATE_CHOICES[0]
    );
  }, [templateChoices, selectedTemplateId]);

  useEffect(() => {
    if (!templateChoices.length) {
      return;
    }

    if (!templateChoices.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(templateChoices[0].id);
    }
  }, [templateChoices, selectedTemplateId]);`
);

// 6) Pass templates to ReportCreationCard
content = content.replace(
  /<ReportCreationCard\s*selectedTemplate=\{selectedTemplate\}\s*selectedTemplateId=\{selectedTemplateId\}\s*onTemplateChange=\{setSelectedTemplateId\}/,
  `<ReportCreationCard
                  selectedTemplate={selectedTemplate}
                  selectedTemplateId={selectedTemplateId}
                  templates={templateChoices}
                  onTemplateChange={setSelectedTemplateId}`
);

// 7) Replace ReportCreationCard params
content = content.replace(
  /function ReportCreationCard\(\{\s*selectedTemplate,\s*selectedTemplateId,\s*onTemplateChange,/,
  `function ReportCreationCard({
  selectedTemplate,
  selectedTemplateId,
  templates,
  onTemplateChange,`
);

// 8) Replace ReportCreationCard props types
content = content.replace(
  /selectedTemplate: ReportTemplateChoice;\s*selectedTemplateId: ReportTemplateId;\s*onTemplateChange: \(templateId: ReportTemplateId\) => void;/,
  `selectedTemplate: ReportTemplateChoice;
  selectedTemplateId: string;
  templates: ReportTemplateChoice[];
  onTemplateChange: (templateId: string) => void;`
);

// 9) Replace template list source
content = content.replace(
  /REPORT_TEMPLATE_CHOICES\.map\(\(template\) => \{/g,
  `templates.map((template) => {`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم تعديل new-report-case-picker.tsx لقبول publishedTemplates.");
