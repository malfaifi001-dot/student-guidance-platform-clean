import { WorkspaceHome } from "@/components/workspace/workspace-home";
import {
  activityLeaderWorkspaceModules,
  OFFICIAL_WORKSPACE_ROUTES,
} from "@/lib/workspace/workspace-modules";

type ActivityLeaderWorkspacePageProps = {
  user?: {
    id?: string;
    name?: string | null;
    officialName?: string | null;
    schoolAccount?: {
      name?: string | null;
      profile?: {
        schoolName?: string | null;
      } | null;
    } | null;
  } | null;
  stats: {
    students: number;
    upcomingReminders: number;
    evidenceItems: number;
    activityReports: number;
  };
  schoolIdentityComplete: boolean;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value || 0);
}

export function ActivityLeaderWorkspacePage({
  user,
  stats,
  schoolIdentityComplete,
}: ActivityLeaderWorkspacePageProps) {
  const schoolName =
    user?.schoolAccount?.profile?.schoolName ||
    user?.schoolAccount?.name ||
    "مدرستك";

  return (
    <WorkspaceHome
      eyebrow="ريادة النشاط"
      title="خدمات رائد النشاط"
      description={`ابدأ من خطة النشاط وفريق النشاط في ${schoolName}، ثم نظّم البرامج والشواهد من المسارات المخصصة لرائد النشاط.`}
      userName={user?.officialName || user?.name}
      userId={user?.id}
      schoolIdentityComplete={schoolIdentityComplete}
      modules={activityLeaderWorkspaceModules}
      showModuleDescription={false}
      showHeroBadges={false}
      stats={[
        {
          label: "الطلاب",
          value: formatCount(stats.students),
          helper: "بيانات الطلاب المتاحة داخل الحساب.",
          icon: "students",
          href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
        },
        {
          label: "مواعيد قريبة",
          value: formatCount(stats.upcomingReminders),
          helper: "فعاليات أو تذكيرات خلال الأيام القادمة.",
          icon: "alerts",
          href: "/dashboard/calendar",
        },
        {
          label: "الشواهد",
          value: formatCount(stats.evidenceItems),
          helper: "الشواهد والمرفقات المسجلة.",
          icon: "evidence",
          href: "/dashboard/activity-leader/evidence",
        },
        {
          label: "التقارير",
          value: formatCount(stats.activityReports),
          helper: "التقارير المسجلة داخل حساب المدرسة.",
          icon: "reports",
          href: OFFICIAL_WORKSPACE_ROUTES.reports,
        },
      ]}
      actions={[
        {
          label: "برامج النشاط",
          href: OFFICIAL_WORKSPACE_ROUTES.activityLeaderPrograms,
          icon: "programs",
        },
      ]}
      notices={[
        {
          title: "برامج النشاط",
          helper: "اختر مجال النشاط ثم عبئ بطاقة التنفيذ.",
        },
        {
          title: "تكليفات المعلمين",
          helper: "يمكن متابعة التكليفات من صفحة متابعة أنشطة المعلمين.",
        },
        {
          title: "الشواهد",
          helper: "ارفع الشواهد قبل إصدار التقرير النهائي.",
        },
      ]}
    />
  );
}
