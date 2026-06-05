const fs = require("fs");

const filePath = "app/dashboard/layout.tsx";

let text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

if (!text.includes('import { CalendarLoginPopup }')) {
  text = text.replace(
    'import { DashboardOnboardingReminder } from "@/components/auth/dashboard-onboarding-reminder";',
    'import { DashboardOnboardingReminder } from "@/components/auth/dashboard-onboarding-reminder";\nimport { CalendarLoginPopup } from "@/components/calendar/calendar-login-popup";'
  );
}

if (!text.includes("<CalendarLoginPopup />")) {
  text = text.replace(
    "          <DashboardOnboardingReminder\n            onboardingCompleted={current.user.onboardingCompleted}\n          />",
    "          <DashboardOnboardingReminder\n            onboardingCompleted={current.user.onboardingCompleted}\n          />\n\n          <CalendarLoginPopup />"
  );
}

fs.writeFileSync(filePath, text, "utf8");

console.log("تم تركيب بوب أب تنبيهات التقويم داخل dashboard layout.");
