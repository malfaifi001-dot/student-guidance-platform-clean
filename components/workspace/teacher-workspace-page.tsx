import { WorkspaceHome } from "@/components/workspace/workspace-home";
import {
  OFFICIAL_WORKSPACE_ROUTES,
  teacherWorkspaceModules,
} from "@/lib/workspace/workspace-modules";

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
    href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
  },
  {
    label: "التقارير",
    value: "٧",
    helper: "تقارير مرتبطة بتكليفات أو مشاركات المعلم.",
    icon: "reports" as const,
    href: OFFICIAL_WORKSPACE_ROUTES.reports,
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
      title="خدمات المعلم"
      description="ابدأ من خدمات المعلم، تابع التكليفات والشواهد، ثم استعرض التقارير وملف الإنجاز بنفس هوية المنصة الموحدة."
      userName={user?.officialName || user?.name}
      modules={teacherWorkspaceModules}
      stats={teacherStats}
      actions={[
        {
          label: "خدمة جديدة",
          href: "/dashboard/teacher/family-community",
          icon: "plus",
          primary: true,
        },
        {
          label: "ملف إنجازي",
          href: "/dashboard/teacher/portfolio",
          icon: "portfolio",
        },
        {
          label: "تقاريري",
          href: OFFICIAL_WORKSPACE_ROUTES.reports,
          icon: "reports",
        },
      ]}
      sideTitle="لوحة المعلم"
      sideDescription="مساحة مختصرة تجمع التكليفات والشواهد والتقارير وملف الإنجاز في تجربة واحدة."
      sideProgressLabel="تقدم ملف الإنجاز"
      sideProgressValue="٦٨٪"
      sideProgressPercent={68}
      sideHref="/dashboard/teacher/portfolio"
      sideHrefLabel="فتح ملف الإنجاز"
      notices={[
        {
          title: "تكليف يحتاج متابعة",
          helper: "خدمة الأسرة والمجتمع لم تكتمل بعد.",
        },
        {
          title: "تحديث ملف الإنجاز",
          helper: "أضف شاهدًا جديدًا لرفع نسبة الإنجاز.",
        },
        {
          title: "استبيان متاح",
          helper: "يوجد استبيان يمكن للمعلم المشاركة فيه.",
        },
      ]}
    />
  );
}