const fs = require("fs");

const runtimePath = "lib/report-engine/report-builder-template-runtime.ts";
let content = fs.readFileSync(runtimePath, "utf8");

content = content.replace(
  `          fileUrl: item.fileUrl || "",
          imageUrl: item.mimeType?.startsWith("image/") ? item.fileUrl : undefined,
          note: item.caption || "",`,
  `          fileUrl: item.fileUrl || "",
          imageUrl:
            item.mimeType?.startsWith("image/") || /\\.(png|jpg|jpeg|webp|gif)$/i.test(item.fileName || "")
              ? item.fileUrl || ""
              : undefined,
          mimeType: item.mimeType || "",
          note: item.caption || "",`
);

content = content.replace(
  `        fileUrl: item.fileUrl || "",
        imageUrl: item.mimeType?.startsWith("image/") ? item.fileUrl : undefined,
        note: item.note || "",`,
  `        fileUrl: item.fileUrl || "",
        imageUrl:
          item.mimeType?.startsWith("image/") || /\\.(png|jpg|jpeg|webp|gif)$/i.test(item.fileName || "")
            ? item.fileUrl || ""
            : undefined,
        mimeType: item.mimeType || "",
        note: item.note || "",`
);

fs.writeFileSync(runtimePath, content, "utf8");

console.log("تم إصلاح PDF API وعزل صفحات التقرير، وتحسين تمرير بيانات الشواهد.");
