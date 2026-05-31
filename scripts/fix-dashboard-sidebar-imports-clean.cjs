const fs = require("fs");

const path = "components/layout/dashboard-sidebar.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  إزالة أي import متلخبط من next/navigation
  ثم إرجاعه بصيغته الصحيحة فقط.
*/
content = content.replace(
  /import\s*\{[\s\S]*?\}\s*from\s*"next\/navigation";\s*/g,
  ""
);

/*
  إزالة أي import سابق من lucide-react مهما كان متكرر أو متلخبط.
*/
content = content.replace(
  /import\s*\{[\s\S]*?\}\s*from\s*"lucide-react";\s*/g,
  ""
);

/*
  تنظيف أي فراغات كثيرة في أعلى الملف.
*/
content = content.replace(/^\s+/, "");

/*
  إضافة imports الصحيحة بعد "use client";
*/
content = content.replace(
  `"use client";`,
  `"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Crown,
  FileBarChart,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  LayoutDashboard,
  LineChart,
  ListChecks,
  PanelRightClose,
  PanelRightOpen,
  PieChart,
  ReceiptText,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  Users,
  WalletCards,
  Workflow,
} from "lucide-react";`
);

/*
  إزالة أي تكرار قديم لـ Link أو React imports لو بقيت بعد الإضافة.
*/
content = content.replace(
  /import Link from "next\/link";\s*(?=[\s\S]*import Link from "next\/link";)/g,
  ""
);

content = content.replace(
  /import\s*\{[\s\S]*?\}\s*from\s*"react";\s*(?=[\s\S]*from "react";)/g,
  ""
);

fs.writeFileSync(path, content, "utf8");

console.log("تم تنظيف imports في dashboard-sidebar.tsx بالكامل.");
