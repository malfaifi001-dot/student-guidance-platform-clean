import { WorkspaceHome } from "@/components/workspace/workspace-home";
import type { WorkspaceModule } from "@/lib/workspace/workspace-modules";
import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";

type PrincipalDashboardProps = {
  principalName: string;
  roleLabel: string;
  schoolName: string | null;
  isFemale: boolean;
};

const principalModules: WorkspaceModule[] = [
  {
    title: "ملف إنجازي",
    description: "تنظيم الأعمال المهنية والشواهد واعتماد النسخ المحفوظة.",
    href: "/dashboard/principal/portfolio",
    icon: "portfolio",
    status: "available",
  },
  {
    title: "منسوبو المدرسة",
    description: "عرض المعلمين والموجهين الطلابيين ورواد النشاط المرتبطين بالمدرسة.",
    href: "/dashboard/principal/teachers",
    icon: "students",
    status: "available",
  },
  {
    title: "الجدول الدراسي",
    description: "Manage the school timetable.",
    href: "/dashboard/principal/timetable",
    icon: "calendar",
    status: "available",
  },
  {
    title: "الحالات",
    description: "استعراض الحالات المتاحة ضمن نطاق المدرسة.",
    href: OFFICIAL_WORKSPACE_ROUTES.cases,
    icon: "assignments",
    status: "available",
  },
  {
    title: "التقارير",
    description: "استعراض التقارير المتاحة من المسار المشترك.",
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
    icon: "reports",
    status: "available",
  },
  {
    title: "الباقات",
    description: "الاطلاع على الباقات المتاحة للحساب.",
    href: "/dashboard/plans",
    icon: "subscription",
    status: "available",
  },
  {
    title: "حسابي",
    description: "مراجعة بيانات الحساب والجلسات.",
    href: "/dashboard/account",
    icon: "account",
    status: "available",
  },
  {
    title: "إعدادات المدرسة",
    description: "مراجعة هوية المدرسة وإعداداتها الحالية.",
    href: "/dashboard/settings/school",
    icon: "schoolSettings",
    status: "available",
  },
];

export function PrincipalDashboard({
  principalName,
  roleLabel,
  schoolName,
  isFemale,
}: PrincipalDashboardProps) {
  return (
    <WorkspaceHome
      eyebrow={roleLabel}
      title="خدمات مدير المدرسة"
      description={
        schoolName
          ? `مساحة العمل الموحدة لمدير مدرسة ${schoolName}.`
          : "مساحة العمل الموحدة لمدير المدرسة."
      }
      userName={principalName}
      welcomeText={isFemale ? "أهلًا بكِ" : "أهلًا بك"}
      modules={principalModules}
    />
  );
}
