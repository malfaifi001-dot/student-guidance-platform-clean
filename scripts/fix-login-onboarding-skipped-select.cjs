const fs = require("fs");

const path = "app/api/auth/login/route.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
`        onboardingCompleted: true,`,
`        onboardingCompleted: true,
        onboardingSkippedAt: true,`
);

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة onboardingSkippedAt إلى select في login route.");
