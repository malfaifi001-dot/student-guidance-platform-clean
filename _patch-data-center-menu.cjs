const fs = require("fs");

const sidebarPath = "components/layout/dashboard-sidebar.tsx";

if (fs.existsSync(sidebarPath)) {
  let text = fs.readFileSync(sidebarPath, "utf8");

  text = text
    .replaceAll("مركز المعلومات", "Data Center")
    .replaceAll("/dashboard/information-center", "/dashboard/data-center")
    .replaceAll('label: "Data Center"', 'label: "Data Center"')
    .replaceAll('title="Data Center"', 'title="Data Center"');

  fs.writeFileSync(sidebarPath, text, "utf8");
  console.log("UPDATED: " + sidebarPath);
}
