const fs = require("fs");

const path = "components/report-engine/report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("savedTemplateIds")) {
  content = content.replace(
`  const [activeTemplateId, setActiveTemplateId] = useState(
    initialReportTemplateBuilderPresets[0]?.id || "",
  );
`,
`  const [activeTemplateId, setActiveTemplateId] = useState(
    initialReportTemplateBuilderPresets[0]?.id || "",
  );

  const [savedTemplateIds, setSavedTemplateIds] = useState<Record<string, string>>({});
`
  );
}

const start = content.indexOf("  async function handleSaveTemplate()");
if (start < 0) {
  throw new Error("لم أجد دالة handleSaveTemplate داخل الملف.");
}

const afterStart = content.slice(start);
const outerIfMatch = afterStart.match(/\n  if \(!activeTemplate\) \{\r?\n\s+return \(/);

let end;

if (outerIfMatch && typeof outerIfMatch.index === "number") {
  end = start + outerIfMatch.index + 1;
} else {
  const braceStart = content.indexOf("{", start);
  let depth = 0;
  end = -1;

  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) {
    throw new Error("لم أستطع تحديد نهاية دالة handleSaveTemplate.");
  }
}

const newFunction = `  async function handleSaveTemplate() {
    if (!activeTemplate) {
      setFeedbackModal({
        open: true,
        type: "error",
        title: "تعذر حفظ القالب",
        message: "لا يوجد قالب نشط لحفظه.",
      });
      return;
    }

    const dbTemplateId = savedTemplateIds[activeTemplate.id];

    const payload = {
      name: activeTemplate.name || "قالب تقرير جديد",
      description:
        activeTemplate.description ||
        "قالب تقرير مخصص يتم بناؤه من بيانات الحالة.",
      serviceSlug: activeTemplate.serviceSlug ?? null,
      type: "SCHOOL",
      content: JSON.stringify(activeTemplate),
      templateJson: activeTemplate,
      genderAware: true,
      isActive: true,
    };

    async function createTemplate() {
      return fetch("/api/dashboard/report-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    async function updateTemplate(templateId: string) {
      return fetch(\`/api/dashboard/report-templates/\${templateId}\`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    try {
      let response = dbTemplateId
        ? await updateTemplate(dbTemplateId)
        : await createTemplate();

      let result = await response.json();

      if (dbTemplateId && response.status === 404) {
        response = await createTemplate();
        result = await response.json();
      }

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || "تعذر حفظ القالب.",
        );
      }

      const savedId =
        result?.template?.id ||
        result?.data?.id ||
        result?.id ||
        dbTemplateId ||
        "";

      if (savedId) {
        setSavedTemplateIds((current) => ({
          ...current,
          [activeTemplate.id]: savedId,
        }));
      }

      setFeedbackModal({
        open: true,
        type: "success",
        title: "تم حفظ القالب",
        message: dbTemplateId
          ? "تم تحديث القالب وحفظ التعديلات بنجاح."
          : "تم إنشاء القالب وحفظه في قاعدة البيانات بنجاح.",
      });
    } catch (error) {
      setFeedbackModal({
        open: true,
        type: "error",
        title: "تعذر حفظ القالب",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء حفظ القالب.",
      });
    }
  }

`;

content = content.slice(0, start) + newFunction + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح منطق حفظ القالب بنجاح.");
