const fs = require("fs");

const filePath = "app/dashboard/layout.tsx";
let text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

if (!text.includes('CalendarLoginPopup')) {
  const importLine =
    'import { CalendarLoginPopup } from "@/components/calendar/calendar-login-popup";';

  const importMatches = [...text.matchAll(/^import .*?;$/gm)];

  if (importMatches.length > 0) {
    const lastImport = importMatches[importMatches.length - 1];
    const insertAt = lastImport.index + lastImport[0].length;
    text = text.slice(0, insertAt) + "\n" + importLine + text.slice(insertAt);
  } else {
    text = importLine + "\n" + text;
  }
}

if (!text.includes("<CalendarLoginPopup />")) {
  const onboardingPattern =
    /<DashboardOnboardingReminder[\s\S]*?\/>/;

  if (onboardingPattern.test(text)) {
    text = text.replace(
      onboardingPattern,
      (match) => `${match}\n\n          <CalendarLoginPopup />`
    );
  } else {
    text = text.replace(
      /<main([^>]*)>/,
      `<main$1>\n          <CalendarLoginPopup />`
    );
  }
}

fs.writeFileSync(filePath, text, "utf8");
console.log("تم تركيب بوب أب التنبيهات في dashboard layout.");
