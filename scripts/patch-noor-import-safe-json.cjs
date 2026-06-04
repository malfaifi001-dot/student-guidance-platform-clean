const fs = require("fs");

const files = [
  "components/data-center/noor-import/noor-import-client.tsx",
  "components/data-center/noor-import/noor-import-session-detail-client.tsx",
];

for (const filePath of files) {
  if (!fs.existsSync(filePath)) {
    console.log(`تجاوز: ${filePath} غير موجود`);
    continue;
  }

  let content = fs.readFileSync(filePath, "utf8");

  if (!content.includes('@/lib/http/read-api-response')) {
    content = content.replace(
      /("use client";\s*\n)/,
      '$1\nimport { readApiResponse } from "@/lib/http/read-api-response";\n'
    );
  }

  content = content.replaceAll(
    "const result = await response.json();",
    "const result = await readApiResponse(response);"
  );

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`تم تحديث: ${filePath}`);
}
