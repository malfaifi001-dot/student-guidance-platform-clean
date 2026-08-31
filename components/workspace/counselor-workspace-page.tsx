import { WorkspaceHome } from "@/components/workspace/workspace-home";
import { DashboardContextCard } from "@/components/dashboard/dashboard-context-card";
import {
  counselorWorkspaceModules,
  OFFICIAL_WORKSPACE_ROUTES,
} from "@/lib/workspace/workspace-modules";

type CounselorWorkspacePageProps = {
  user?: {
    id?: string;
    name?: string | null;
    officialName?: string | null;
  } | null;
  stats: {
    students: number;
    cases: number;
    reports: number;
    evidences: number;
    draftCases: number;
    readyForReport: number;
  };
  remindersCount: number;
  schoolIdentityComplete: boolean;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value || 0);
}

export function CounselorWorkspacePage({
  user,
  stats,
  remindersCount,
  schoolIdentityComplete,
}: CounselorWorkspacePageProps) {
  const compactModules = counselorWorkspaceModules.map((module) => ({
    ...module,
    description: "",
  }));

  return (
    <div className="counselor-workspace-page">
      <WorkspaceHome
        eyebrow="التوجيه الطلابي"
        title="خدمات التوجيه الطلابي"
        description="تابع الحالات والمهام القادمة من مساحة عمل واحدة."
        userName={user?.officialName || user?.name}
        userId={user?.id}
        schoolIdentityComplete={schoolIdentityComplete}
        modules={compactModules}
        stats={[
          {
            label: "الحالات",
            value: formatCount(stats.cases),
            helper: "إجمالي الحالات داخل الحساب.",
            icon: "cases",
            href: OFFICIAL_WORKSPACE_ROUTES.cases,
          },
          {
            label: "جاهزة للتقرير",
            value: formatCount(stats.readyForReport),
            helper: "حالات مرسلة ولم يصدر لها تقرير.",
            icon: "reports",
            href: OFFICIAL_WORKSPACE_ROUTES.cases,
          },
          {
            label: "الطلاب",
            value: formatCount(stats.students),
            helper: "عدد الطلاب المسجلين.",
            icon: "students",
            href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
          },
          {
            label: "التنبيهات",
            value: formatCount(remindersCount),
            helper: "تذكيرات قريبة تحتاج متابعة.",
            icon: "alerts",
          },
        ]}
        actions={[
          {
            label: "الحالات",
            href: OFFICIAL_WORKSPACE_ROUTES.cases,
            icon: "cases",
          },
          {
            label: "التقارير",
            href: OFFICIAL_WORKSPACE_ROUTES.reports,
            icon: "reports",
          },
        ]}
        notices={[
          {
            title: "مسودات تحتاج إكمال",
            helper: `لديك ${formatCount(stats.draftCases)} مسودة يمكن إكمالها.`,
          },
          {
            title: "تقارير جاهزة",
            helper: `لديك ${formatCount(stats.readyForReport)} حالة جاهزة للتقرير.`,
          },
          {
            title: "مركز التحليل",
            helper: "استخدم مركز تحليل النتائج عند الحاجة إلى تدخلات ذكية.",
          },
        ]}
        compactDashboard
        contextSlot={
          <DashboardContextCard
            title="ملخص التوجيه"
            items={[
              { label: "حالات جاهزة", value: formatCount(stats.readyForReport) },
              { label: "متابعات قريبة", value: formatCount(remindersCount) },
            ]}
          />
        }
      />

    </div>
  );
}
