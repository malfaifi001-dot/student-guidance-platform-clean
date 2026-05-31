const fs = require("fs");

const path = "components/reports/new-report-case-picker.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
`type ReportTemplateId = "official-long" | "visual-activity" | "executive-brief";

type ReportTemplateChoice = {
  id: ReportTemplateId;
  name: string;
  description: string;
  bestFor: string;
  badge: string;
};`,
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

content = content.replace(
`type NewReportCasePickerProps = {
  cases: ReportCaseListItem[];
  initialCaseId?: string;
};`,
`type NewReportCasePickerProps = {
  cases: ReportCaseListItem[];
  initialCaseId?: string;
  publishedTemplates?: PublishedReportTemplateOption[];
};`
);

content = content.replace(
`export function NewReportCasePicker({
  cases,
  initialCaseId = "",
}: NewReportCasePickerProps) {`,
`export function NewReportCasePicker({
  cases,
  initialCaseId = "",
  publishedTemplates = [],
}: NewReportCasePickerProps) {`
);

content = content.replace(
`  const [selectedTemplateId, setSelectedTemplateId] =
    useState<ReportTemplateId>("official-long");`,
`  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    publishedTemplates[0]?.id || "official-long"
  );`
);

content = content.replace(
`  const selectedTemplate = useMemo(() => {
    return (
      REPORT_TEMPLATE_CHOICES.find(
        (template) => template.id === selectedTemplateId
      ) || REPORT_TEMPLATE_CHOICES[0]
    );
  }, [selectedTemplateId]);`,
`  const templateChoices = useMemo<ReportTemplateChoice[]>(() => {
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

content = content.replace(
`                  selectedTemplate={selectedTemplate}
                  selectedTemplateId={selectedTemplateId}
                  onTemplateChange={setSelectedTemplateId}`,
`                  selectedTemplate={selectedTemplate}
                  selectedTemplateId={selectedTemplateId}
                  templates={templateChoices}
                  onTemplateChange={setSelectedTemplateId}`
);

content = content.replace(
`function ReportCreationCard({
  selectedTemplate,
  selectedTemplateId,
  onTemplateChange,`,
`function ReportCreationCard({
  selectedTemplate,
  selectedTemplateId,
  templates,
  onTemplateChange,`
);

content = content.replace(
`  selectedTemplate: ReportTemplateChoice;
  selectedTemplateId: ReportTemplateId;
  onTemplateChange: (templateId: ReportTemplateId) => void;`,
`  selectedTemplate: ReportTemplateChoice;
  selectedTemplateId: string;
  templates: ReportTemplateChoice[];
  onTemplateChange: (templateId: string) => void;`
);

content = content.replace(
`        {REPORT_TEMPLATE_CHOICES.map((template) => {`,
`        {templates.map((template) => {`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط واجهة الموجه بالقوالب المنشورة.");
