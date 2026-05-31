const fs = require("fs");

const path = "components/report-engine/report-template-studio.tsx";
let content = fs.readFileSync(path, "utf8");

const start = content.indexOf("  function changeActiveTemplateStatus(status: ReportTemplateStatus)");
if (start < 0) {
  throw new Error("لم أجد دالة changeActiveTemplateStatus.");
}

const nextFunctionMarker = "  function addGeneratedSnapshot";
const end = content.indexOf(nextFunctionMarker, start);

if (end < 0) {
  throw new Error("لم أجد نهاية دالة changeActiveTemplateStatus.");
}

const newFunction = `  async function changeActiveTemplateStatus(status: ReportTemplateStatus) {
    if (!activeTemplate) {
      setFeedbackModal({
        open: true,
        type: "error",
        title: "تعذر تحديث حالة القالب",
        message: "لا يوجد قالب نشط لتحديث حالته.",
      });
      return;
    }

    const updatedTemplate: ReportTemplateBuilderModel = {
      ...activeTemplate,
      status,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    updateActiveTemplate(() => updatedTemplate);

    const dbTemplateId = savedTemplateIds[activeTemplate.id];

    const payload = {
      name: updatedTemplate.name || "قالب تقرير جديد",
      description:
        updatedTemplate.description ||
        "قالب تقرير مخصص يتم بناؤه من بيانات الحالة.",
      serviceSlug: updatedTemplate.serviceSlug ?? null,
      type: "SCHOOL",
      content: JSON.stringify(updatedTemplate),
      templateJson: updatedTemplate,
      genderAware: true,
      isActive: status !== "ARCHIVED",
    };

    try {
      const response = dbTemplateId
        ? await fetch(\`/api/dashboard/report-templates/\${dbTemplateId}\`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/dashboard/report-templates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || "تعذر تحديث حالة القالب.",
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
        title:
          status === "PUBLISHED"
            ? "تم نشر القالب"
            : status === "ARCHIVED"
              ? "تمت أرشفة القالب"
              : "تم تحويل القالب إلى مسودة",
        message:
          status === "PUBLISHED"
            ? "تم نشر القالب وحفظ حالته في قاعدة البيانات بنجاح."
            : status === "ARCHIVED"
              ? "تمت أرشفة القالب وحفظ التغيير في قاعدة البيانات."
              : "تم تحويل القالب إلى مسودة وحفظ التغيير في قاعدة البيانات.",
      });
    } catch (error) {
      updateActiveTemplate(() => activeTemplate);

      setFeedbackModal({
        open: true,
        type: "error",
        title: "تعذر تحديث حالة القالب",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء تحديث حالة القالب.",
      });
    }
  }

`;

content = content.slice(0, start) + newFunction + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط تغيير حالة القالب بقاعدة البيانات.");
