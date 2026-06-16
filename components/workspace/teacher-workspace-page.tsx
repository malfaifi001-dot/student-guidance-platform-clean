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

export function TeacherWorkspacePage({ user }: TeacherWorkspacePageProps) {
  return (
    <WorkspaceHome
      eyebrow="مساحة المعلم"
      title="خدمات المعلم"
      description="ابدأ من خدمات المعلم، تابع التكليفات والشواهد، ثم استعرض التقارير وملف الإنجاز بنفس هوية المنصة الموحدة."
      userName={user?.officialName || user?.name}
      modules={teacherWorkspaceModules}
      actions={[
        {
          label: "تكليفاتي",
          href: "/dashboard/teacher/assignments",
          icon: "cases",
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
      sideDescription="مساحة مختصرة تجمع التكليفات والشواهد والتقارير وملف الإنجاز في تجربة واحدة، مع إبقاء الميزات التفصيلية قيد التصميم حتى اعتماد المتطلبات."
      sideHref="/dashboard/teacher/portfolio"
      sideHrefLabel="فتح ملف الإنجاز"
    />
  );
}
