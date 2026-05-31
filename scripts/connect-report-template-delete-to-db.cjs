const fs = require("fs");

const path = "components/report-engine/report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

// 1) لا نحمّل القوالب غير النشطة بعد الحذف/الأرشفة
content = content.replace(
  '"/api/dashboard/report-templates?includeInactive=true"',
  '"/api/dashboard/report-templates"'
);

// 2) استبدال confirmDeleteTemplate بحذف حقيقي من قاعدة البيانات إذا كان محفوظًا
const start = content.indexOf("  function confirmDeleteTemplate()");
if (start < 0) {
  throw new Error("لم أجد دالة confirmDeleteTemplate.");
}

const nextMarker = "  function requestDeletePage";
const end = content.indexOf(nextMarker, start);

if (end < 0) {
  throw new Error("لم أجد نهاية دالة confirmDeleteTemplate.");
}

const newFunction = `  async function confirmDeleteTemplate() {
    if (!templatePendingDelete) {
      return;
    }

    const dbTemplateId = savedTemplateIds[templatePendingDelete.id];

    try {
      if (dbTemplateId) {
        const response = await fetch(
          \`/api/dashboard/report-templates/\${dbTemplateId}\`,
          {
            method: "DELETE",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error || result?.message || "تعذر حذف القالب.",
          );
        }
      }

      const remainingTemplates = templates.filter(
        (template) => template.id !== templatePendingDelete.id,
      );

      setTemplates(remainingTemplates);

      setSavedTemplateIds((current) => {
        const next = { ...current };
        delete next[templatePendingDelete.id];
        return next;
      });

      if (activeTemplateId === templatePendingDelete.id) {
        setActiveTemplateId(remainingTemplates[0]?.id || "");
      }

      setTemplatePendingDelete(null);

      setFeedbackModal({
        open: true,
        type: "success",
        title: "تم حذف القالب",
        message: dbTemplateId
          ? "تم حذف القالب من قاعدة البيانات وإزالته من القائمة."
          : "تم حذف القالب غير المحفوظ من القائمة.",
      });
    } catch (error) {
      setFeedbackModal({
        open: true,
        type: "error",
        title: "تعذر حذف القالب",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء حذف القالب.",
      });
    }
  }

`;

content = content.slice(0, start) + newFunction + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط حذف القالب بقاعدة البيانات بنجاح.");
