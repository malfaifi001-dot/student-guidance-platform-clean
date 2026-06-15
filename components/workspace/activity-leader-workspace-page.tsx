import { WorkspaceHome } from "@/components/workspace/workspace-home";
import {
  activityLeaderWorkspaceModules,
  OFFICIAL_WORKSPACE_ROUTES,
} from "@/lib/workspace/workspace-modules";

type ActivityLeaderWorkspacePageProps = {
  user?: {
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
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value || 0);
}

export function ActivityLeaderWorkspacePage({
  user,
  stats,
}: ActivityLeaderWorkspacePageProps) {
  const schoolName =
    user?.schoolAccount?.profile?.schoolName ||
    user?.schoolAccount?.name ||
    "مدرستك";

  return (
    <WorkspaceHome
      eyebrow="ريادة النشاط"
      title="خدمات رائد النشاط"
      description={`ابدأ من برامج النشاط في ${schoolName}، ثم تابع الحالات والشواهد وأصدر التقارير من المسارات الرسمية.`}
      userName={user?.officialName || user?.name}
      modules={activityLeaderWorkspaceModules}
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
          helper: "تقارير مرتبطة بالأنشطة.",
          icon: "reports",
          href: OFFICIAL_WORKSPACE_ROUTES.reports,
        },
      ]}
      actions={[
        {
          label: "برنامج جديد",
          href: "/dashboard/activity-leader/programs/new",
          icon: "plus",
          primary: true,
        },
        {
          label: "برامج النشاط",
          href: OFFICIAL_WORKSPACE_ROUTES.activityLeaderPrograms,
          icon: "programs",
        },
        {
          label: "التقارير",
          href: OFFICIAL_WORKSPACE_ROUTES.reports,
          icon: "reports",
        },
      ]}
      sideTitle="نشاطك اليوم"
      sideDescription="ابدأ بتجهيز البرنامج، ثم تابع الحالة والشواهد، وبعد اكتمال التنفيذ أصدر التقرير."
      sideProgressLabel="الشواهد المسجلة"
      sideProgressValue={formatCount(stats.evidenceItems)}
      sideProgressPercent={Math.min(stats.evidenceItems * 20, 100)}
      sideHref={OFFICIAL_WORKSPACE_ROUTES.cases}
      sideHrefLabel="فتح مركز الأنشطة"
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