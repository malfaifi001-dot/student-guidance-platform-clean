const fs = require("fs");

const routePath = "app/api/dashboard/reports/[reportId]/export/pdf/route.ts";
let content = fs.readFileSync(routePath, "utf8");

if (!content.includes("cookieHeader = request.headers.get")) {
  content = content.replace(
`const page = await browser.newPage();`,
`const cookieHeader = request.headers.get("cookie") || "";
    const browserContext = await browser.newContext({
      extraHTTPHeaders: cookieHeader ? { cookie: cookieHeader } : {},
    });
    const page = await browserContext.newPage();`
  );

  content = content.replace(
`let page = await browser.newPage();`,
`const cookieHeader = request.headers.get("cookie") || "";
    const browserContext = await browser.newContext({
      extraHTTPHeaders: cookieHeader ? { cookie: cookieHeader } : {},
    });
    let page = await browserContext.newPage();`
  );
}

fs.writeFileSync(routePath, content, "utf8");

console.log("تم تجهيز PDF export ليمرر Cookie الجلسة إلى Playwright.");
