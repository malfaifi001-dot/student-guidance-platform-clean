import { WorkspaceHome } from "@/components/workspace/workspace-home";
import { teacherWorkspaceModules } from "@/lib/workspace/workspace-modules";

type TeacherWorkspacePageProps = {
  user?: {
    name?: string | null;
    officialName?: string | null;
  } | null;
};

const teacherStats = [
  {
    label: "تقدم ملف الإنجاز",
    value: "٦٨٪",
    helper: "نسبة مبدئية لقياس اكتمال الشواهد والمشاركات.",
    icon: "progress" as const,
    href: "/dashboard/teacher/portfolio",
  },
  {
    label: "الطلاب",
    value: "١٢٤",
    helper: "عدد الطلاب المتاحين حسب صلاحيات المعلم.",
    icon: "students" as const,
    href: "/dashboard/data-center/student-data-import",
  },
  {
    label: "التقارير",
    value: "٧",
    helper: "تقارير مرتبطة بتكليفات أو مشاركات المعلم.",
    icon: "reports" as const,
    href: "/dashboard/report-2",
  },
  {
    label: "التنبيهات",
    value: "٣",
    helper: "تنبيهات قريبة تحتاج متابعة.",
    icon: "alerts" as const,
  },
];

export function TeacherWorkspacePage({ user }: TeacherWorkspacePageProps) {
  return (
    <WorkspaceHome
      eyebrow="مساحة المعلم"
      title="لوحة المعلم"
      description="ابدأ من خدمات المعلم، تابع التكليفات والشواهد، ثم استعرض التقارير وملف الإنجاز بنفس هوية المنصة الموحدة."
      userName={user?.officialName || user?.name}
      modules={teacherWorkspaceModules}
      stats={teacherStats}
    />
  );
}