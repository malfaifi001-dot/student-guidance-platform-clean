import { redirect } from "next/navigation";

import { CalendarCenterClient } from "@/components/calendar/calendar-center-client";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

export default async function DashboardCalendarPage() {
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  if (!context.schoolAccountId) {
    redirect("/dashboard");
  }

  const schoolAccountId = context.schoolAccountId;

  const [reminders, services, cases, students] = await Promise.all([
    prisma.calendarReminder.findMany({
      where: {
        schoolAccountId,
        status: {
          not: "CANCELED",
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          scheduledAt: "asc",
        },
      ],
      take: 80,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        caseEntry: {
          select: {
            id: true,
            title: true,
            status: true,
            service: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
            grade: true,
            classroom: true,
          },
        },
      },
    }),

    prisma.service.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),

    prisma.caseEntry.findMany({
      where: {
        schoolAccountId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 80,
      select: {
        id: true,
        title: true,
        status: true,
        service: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),

    prisma.student.findMany({
      where: {
        schoolAccountId,
        isActive: true,
      },
      orderBy: {
        fullName: "asc",
      },
      take: 150,
      select: {
        id: true,
        fullName: true,
        grade: true,
        classroom: true,
      },
    }),
  ]);

  return (
    <main className="min-w-0 space-y-4 sm:space-y-5" dir="rtl">
      <section className="rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8">
        <h1 className="text-2xl font-black sm:text-4xl">التقويم والتنبيهات</h1>
      </section>

      <CalendarCenterClient
        reminders={reminders.map((item) => ({
          ...item,
          scheduledAt: item.scheduledAt.toISOString(),
        }))}
        services={services}
        cases={cases}
        students={students}
      />
    </main>
  );
}
