import { WorkspaceHome } from "@/components/workspace/workspace-home";
import {
  counselorWorkspaceModules,
  OFFICIAL_WORKSPACE_ROUTES,
} from "@/lib/workspace/workspace-modules";

type CounselorWorkspacePageProps = {
  user?: {
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
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value || 0);
}

export function CounselorWorkspacePage({
  user,
  stats,
  remindersCount,
}: CounselorWorkspacePageProps) {
  const compactModules = counselorWorkspaceModules.map((module) => ({
    ...module,
    description: "",
  }));

  return (
    <div className="counselor-workspace-page">
      <WorkspaceHome
        eyebrow="التوجيه الطلابي"
        title=""
        description=""
        userName={user?.officialName || user?.name}
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
            label: "بدء متابعة",
            href: "/dashboard/student-follow-up/new",
            icon: "plus",
            primary: true,
          },
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
        sideTitle="رشد معك اليوم"
        sideDescription="راجع التنبيهات القريبة، ثم ابدأ بالحالات التي تحتاج إجراء."
        sideProgressLabel="اقتراحات قريبة"
        sideProgressValue={formatCount(remindersCount)}
        sideProgressPercent={Math.min(remindersCount * 34, 100)}
        sideHref="/dashboard/calendar"
        sideHrefLabel="فتح التقويم"
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
      />

      <style>{`
        .counselor-workspace-page p:empty {
          display: none;
        }

        .counselor-workspace-page
          > main
          > section
          > section
          > section:nth-of-type(3)
          > div:first-child
          > h2
          + p {
          display: none;
        }

        .counselor-workspace-page
          > main
          > section
          > section
          > section:nth-of-type(3)
          article
          h3 {
          margin-top: 0.75rem;
        }

        .counselor-workspace-page
          > main
          > section
          > section
          > section:nth-of-type(3)
          article
          h3
          + p {
          display: none;
        }
      `}</style>
    </div>
  );
}
