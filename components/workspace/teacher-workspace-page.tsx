import { WorkspaceHome } from "@/components/workspace/workspace-home";
import { DashboardContextCard } from "@/components/dashboard/dashboard-context-card";
import {
  OFFICIAL_WORKSPACE_ROUTES,
  teacherWorkspaceModules,
} from "@/lib/workspace/workspace-modules";
import { prisma } from "@/lib/prisma";

type TeacherWorkspacePageProps = {
  user?: {
    id?: string;
    name?: string | null;
    officialName?: string | null;
    schoolAccountId?: string | null;
  } | null;
  schoolAccountId?: string | null;
  schoolIdentityComplete: boolean;
};

function formatDate(value: Date) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  } catch {
    return value.toLocaleDateString();
  }
}

export async function TeacherWorkspacePage({
  user,
  schoolAccountId,
  schoolIdentityComplete,
}: TeacherWorkspacePageProps) {
  function formatCount(value: number) {
    return new Intl.NumberFormat("ar-SA").format(value || 0);
  }

  const notices: { title: string; helper: string }[] = [];
  let contextItems = [
    { label: "التكليفات", value: "—" },
    { label: "أقرب مهمة", value: "لا توجد" },
  ];

  let stats: {
    label: string;
    value: string;
    helper: string;
    icon:
      | "progress"
      | "students"
      | "reports"
      | "alerts"
      | "cases"
      | "evidence"
      | "assignments";
    href: string;
  }[] = [];

  if (schoolAccountId) {
    const now = new Date();
    const threeDaysLater = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    );

    const assignmentCount = user?.id
      ? await prisma.internalAssignment.count({
          where: {
            schoolAccountId,
            assigneeId: user.id,
          },
        })
      : 0;

    const [students, cases, reports] = await Promise.all([
      prisma.student.count({
        where: {
          schoolAccountId,
          isActive: true,
        },
      }),
      prisma.caseEntry.count({
        where: {
          schoolAccountId,
        },
      }),
      prisma.guidanceReport.count({
        where: {
          caseEntry: {
            schoolAccountId,
          },
        },
      }),
    ]);

    stats = [
      {
        label: "الطلاب",
        value: formatCount(students),
        helper: "عدد الطلاب المسجلين.",
        icon: "students",
        href: OFFICIAL_WORKSPACE_ROUTES.studentImport,
      },
      {
        label: "الحالات",
        value: formatCount(cases),
        helper: "إجمالي الحالات داخل الحساب.",
        icon: "cases",
        href: OFFICIAL_WORKSPACE_ROUTES.cases,
      },
      {
        label: "التقارير",
        value: formatCount(reports),
        helper: "التقارير المصدرة داخل الحساب.",
        icon: "reports",
        href: OFFICIAL_WORKSPACE_ROUTES.reports,
      },
      {
        label: "التكليفات",
        value: formatCount(assignmentCount),
        helper: "التكليفات المرسلة إليك.",
        icon: "assignments",
        href: "/dashboard/teacher/assignments",
      },
    ];

    const upcomingReminders = await prisma.calendarReminder.findMany({
      where: {
        schoolAccountId,
        status: "PENDING",
        scheduledAt: {
          gte: now,
          lte: threeDaysLater,
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 5,
      select: {
        title: true,
        scheduledAt: true,
        priority: true,
      },
    });

    contextItems = [
      { label: "التكليفات", value: formatCount(assignmentCount) },
      {
        label: "أقرب مهمة",
        value: upcomingReminders[0]?.title || "لا توجد",
      },
    ];

    const lateReminders = await prisma.calendarReminder.count({
      where: {
        schoolAccountId,
        status: "PENDING",
        scheduledAt: {
          lt: now,
        },
      },
    });

    if (lateReminders > 0) {
      notices.push({
        title: `لديك ${lateReminders} تنبيه متأخر`,
        helper: "بعض التنبيهات تجاوزت موعدها — راجع التقويم.",
      });
    }

    for (const reminder of upcomingReminders) {
      notices.push({
        title: reminder.title,
        helper: `الموعد: ${formatDate(reminder.scheduledAt)}`,
      });
    }
  }

  const compactModules = teacherWorkspaceModules.map((module) => ({
    ...module,
    description: "",
  }));

  return (
    <div className="teacher-workspace-page">
      <WorkspaceHome
        eyebrow="مساحة المعلم"
        title="خدمات المعلم"
        description="ابدأ من خدمات المعلم، تابع التكليفات والشواهد، ثم استعرض التقارير وملف الإنجاز بنفس هوية المنصة الموحدة."
        userName={user?.officialName || user?.name}
        userId={user?.id}
        schoolIdentityComplete={schoolIdentityComplete}
        modules={compactModules}
        stats={stats}
        showHeroBadges={false}
        showModuleDescription={false}
        actions={[
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
        notices={notices}
        compactDashboard
        contextSlot={
          <DashboardContextCard title="ملخص المعلم" items={contextItems} />
        }
      />

      <style>{`
        .teacher-workspace-page
          > main
          > section
          > section
          > section:nth-of-type(3)
          article
          h3
          + p {
          display: none;
        }

        .teacher-workspace-page
          > main
          > section
          > section
          > section:nth-of-type(3)
          > div:first-child
          > h2
          + p {
          display: none;
        }
      `}</style>
    </div>
  );
}
