const fs = require("fs");

const path = "components/reports/new-report-case-picker.tsx";
let content = fs.readFileSync(path, "utf8");

// 1) أضف نوع القالب المنشور قبل Props
if (!content.includes("type PublishedReportTemplateOption =")) {
  content = content.replace(
`type NewReportCasePickerProps = {
  cases: ReportCaseListItem[];
  initialCaseId?: string;
};`,
`type PublishedReportTemplateOption = {
  id: string;
  name: string;
  description: string;
  serviceSlug: string | null;
  scope: "GLOBAL" | "SERVICE";
  status: "PUBLISHED" | string;
  pagesCount: number;
};

type NewReportCasePickerProps = {
  cases: ReportCaseListItem[];
  initialCaseId?: string;
  publishedTemplates?: PublishedReportTemplateOption[];
};`
  );
}

// 2) أضف publishedTemplates في استقبال props
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

// 3) خلي selectedTemplateId string بدل النوع القديم الثابت
content = content.replace(
`  const [selectedTemplateId, setSelectedTemplateId] =
    useState<ReportTemplateId>("official-long");`,
`  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>(publishedTemplates[0]?.id || "official-long");`
);

// 4) أضف خيارات القوالب المنشورة بعد selectedTemplate الحالي أو قبل useEffect
if (!content.includes("const availableReportTemplates = useMemo(() => {")) {
  const marker = `  }, [selectedTemplateId]);

  useEffect(() => {`;

  if (!content.includes(marker)) {
    throw new Error("لم أجد مكان selectedTemplate useMemo.");
  }

  content = content.replace(
marker,
`  }, [selectedTemplateId]);

  const availableReportTemplates = useMemo(() => {
    if (publishedTemplates.length > 0) {
      return publishedTemplates.map((template) => ({
        id: template.id,
        title: template.name,
        description:
          template.description ||
          "قالب منشور من صانع قوالب التقارير.",
        badge:
          template.scope === "SERVICE"
            ? "قالب خدمة"
            : "قالب عام",
        serviceSlug: template.serviceSlug,
        pagesCount: template.pagesCount,
        isBuilderTemplate: true,
      }));
    }

    return reportTemplateOptions.map((template) => ({
      ...template,
      isBuilderTemplate: false,
      serviceSlug: null,
      pagesCount: 0,
    }));
  }, [publishedTemplates]);

  useEffect(() => {
    if (publishedTemplates.length > 0 && !publishedTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(publishedTemplates[0].id);
    }
  }, [publishedTemplates, selectedTemplateId]);

  useEffect(() => {`
  );
}

// 5) غيّر selectedTemplate ليقرأ من الخيارات الجديدة
content = content.replace(
`  const selectedTemplate = useMemo(() => {
    return (
      reportTemplateOptions.find((template) => template.id === selectedTemplateId) ||
      reportTemplateOptions[0]
    );
  }, [selectedTemplateId]);`,
`  const selectedTemplate = useMemo(() => {
    return (
      availableReportTemplates.find((template) => template.id === selectedTemplateId) ||
      availableReportTemplates[0] ||
      reportTemplateOptions[0]
    );
  }, [availableReportTemplates, selectedTemplateId]);`
);

// 6) مرر availableReportTemplates إلى كرت الإنشاء
content = content.replace(
`                  selectedTemplate={selectedTemplate}
                  selectedTemplateId={selectedTemplateId}
                  onTemplateChange={setSelectedTemplateId}`,
`                  selectedTemplate={selectedTemplate}
                  selectedTemplateId={selectedTemplateId}
                  templates={availableReportTemplates}
                  onTemplateChange={setSelectedTemplateId}`
);

// 7) حدّث Props حق ReportCreationCard إذا كان فيه type/params
content = content.replace(
`  selectedTemplate,
  selectedTemplateId,
  onTemplateChange,`,
`  selectedTemplate,
  selectedTemplateId,
  templates,
  onTemplateChange,`
);

content = content.replace(
`  selectedTemplate: (typeof reportTemplateOptions)[number];
  selectedTemplateId: ReportTemplateId;
  onTemplateChange: (templateId: ReportTemplateId) => void;`,
`  selectedTemplate: {
    id: string;
    title: string;
    description: string;
    badge: string;
    serviceSlug?: string | null;
    pagesCount?: number;
    isBuilderTemplate?: boolean;
  };
  selectedTemplateId: string;
  templates: Array<{
    id: string;
    title: string;
    description: string;
    badge: string;
    serviceSlug?: string | null;
    pagesCount?: number;
    isBuilderTemplate?: boolean;
  }>;
  onTemplateChange: (templateId: string) => void;`
);

// 8) غيّر عرض خيارات القوالب داخل ReportCreationCard من reportTemplateOptions إلى templates
content = content.replaceAll("reportTemplateOptions.map((template)", "templates.map((template)");

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط NewReportCasePicker بالقوالب المنشورة.");
