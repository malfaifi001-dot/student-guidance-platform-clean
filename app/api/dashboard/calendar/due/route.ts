import { NextResponse } from "next/server";

import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

const MAX_REMIND_BEFORE_MINUTES = 10080;

function priorityWeight(priority: string) {
  if (priority === "URGENT") return 0;
  if (priority === "IMPORTANT") return 1;
  return 2;
}

export async function GET() {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const now = new Date();
  const lookAhead = new Date(
    now.getTime() + MAX_REMIND_BEFORE_MINUTES * 60 * 1000,
  );

  const reminders = await prisma.calendarReminder.findMany({
    where: {
      schoolAccountId: authResult.schoolAccountId,
      status: "PENDING",
      scheduledAt: {
        lte: lookAhead,
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
    take: 50,
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
  });

  const dueReminders = reminders
    .map((reminder) => {
      const remindBeforeMinutes = Math.max(
        0,
        Number(reminder.remindBeforeMinutes || 0),
      );

      const showAt = new Date(
        reminder.scheduledAt.getTime() - remindBeforeMinutes * 60 * 1000,
      );

      return {
        ...reminder,
        scheduledAt: reminder.scheduledAt.toISOString(),
        showAt: showAt.toISOString(),
        isLate: reminder.scheduledAt.getTime() < now.getTime(),
      };
    })
    .filter((reminder) => new Date(reminder.showAt).getTime() <= now.getTime())
    .sort((a, b) => {
      const priorityDiff = priorityWeight(a.priority) - priorityWeight(b.priority);

      if (priorityDiff !== 0) return priorityDiff;

      return (
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    })
    .slice(0, 8);

  return NextResponse.json({
    success: true,
    reminders: dueReminders,
  });
}
