const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  نزيل أي import type قديم لـ ComponentType لو كان متكرر.
*/
content = content.replace(
  /import\s+type\s+\{\s*ComponentType\s*\}\s+from\s+"react";\s*/g,
  ""
);

/*
  نضيف ComponentType كـ type import مستقل من React.
*/
content = content.replace(
  /import\s+\{\s*useEffect,\s*useMemo,\s*useState\s*\}\s+from\s+"react";/,
  `import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح ComponentType في dashboard-sidebar.tsx.");
