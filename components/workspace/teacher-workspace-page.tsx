import { WorkspaceHome } from "@/components/workspace/workspace-home";
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
}: TeacherWorkspacePageProps) {
  let notices: { title: string; helper: string }[] = [];

  if (schoolAccountId) {
    const now = new Date();
    const threeDaysLater = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    );

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
      notices={notices}
    />
  );
}
