const fs = require("fs");

const path = "components/dashboard/soft-blue-dashboard.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  إصلاح ترتيب تعريف theme:
  لازم theme يجي قبل jobTitle لأنه يستخدم theme.label.
*/
content = content.replace(
`  const profile = user.schoolAccount?.profile;
  const displayName = user.officialName || user.name || "الموجه/الموجهة";
  const jobTitle =
    user.jobTitle || theme.label;`,
`  const profile = user.schoolAccount?.profile;
  const theme = getDashboardTheme(user.gender);
  const displayName = user.officialName || user.name || "الموجه/الموجهة";
  const jobTitle =
    user.jobTitle || theme.label;`
);

content = content.replace(
`  const theme = getDashboardTheme(user.gender);
  const counselorImage = theme.avatarFallback;`,
`  const counselorImage = theme.avatarFallback;`
);

/*
  تنظيف احتياطي لو صار theme مكرر.
*/
content = content.replace(
`  const theme = getDashboardTheme(user.gender);
  const theme = getDashboardTheme(user.gender);`,
`  const theme = getDashboardTheme(user.gender);`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح ترتيب theme قبل jobTitle.");
