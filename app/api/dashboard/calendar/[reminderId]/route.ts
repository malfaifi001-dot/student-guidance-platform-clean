import { NextResponse } from "next/server";

import { logPlatformActivity } from "@/lib/admin/activity-log";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    reminderId: string;
  }>;
};

function asCleanString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeStatus(value: unknown) {
  const status = asCleanString(value);

  if (status === "PENDING" || status === "COMPLETED" || status === "CANCELED") {
    return status;
  }

  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { reminderId } = await context.params;
    const body = await request.json();

    const status = normalizeStatus(body?.status);

    const reminder = await prisma.calendarReminder.findFirst({
      where: {
        id: reminderId,
        schoolAccountId: authResult.schoolAccountId,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!reminder) {
      return NextResponse.json(
        {
          success: false,
          error: "التنبيه غير موجود.",
        },
        { status: 404 },
      );
    }

    const updated = await prisma.calendarReminder.update({
      where: {
        id: reminder.id,
      },
      data: {
        ...(status
          ? {
              status,
              completedAt: status === "COMPLETED" ? new Date() : null,
              completedById: status === "COMPLETED" ? authResult.user.id : null,
            }
          : {}),
      },
    });

    await logPlatformActivity({
      actorUserId: authResult.user.id,
      schoolAccountId: authResult.schoolAccountId,
      category: "CALENDAR",
      action:
        status === "COMPLETED"
          ? "calendar-reminder-completed"
          : "calendar-reminder-updated",
      severity: status === "COMPLETED" ? "SUCCESS" : "INFO",
      title:
        status === "COMPLETED"
          ? "تم إكمال تنبيه في التقويم"
          : "تم تحديث تنبيه في التقويم",
      details: {
        reminderId: updated.id,
        reminderTitle: updated.title,
        status: updated.status,
      },
    });

    return NextResponse.json({
      success: true,
      reminder: updated,
    });
  } catch (error) {
    console.error("Failed to update calendar reminder:", error);

    return NextResponse.json(
      {
        success: false,
        error: "تعذر تحديث التنبيه.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { reminderId } = await context.params;

    const reminder = await prisma.calendarReminder.findFirst({
      where: {
        id: reminderId,
        schoolAccountId: authResult.schoolAccountId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!reminder) {
      return NextResponse.json(
        {
          success: false,
          error: "التنبيه غير موجود.",
        },
        { status: 404 },
      );
    }

    await prisma.calendarReminder.update({
      where: {
        id: reminder.id,
      },
      data: {
        status: "CANCELED",
      },
    });

    await logPlatformActivity({
      actorUserId: authResult.user.id,
      schoolAccountId: authResult.schoolAccountId,
      category: "CALENDAR",
      action: "calendar-reminder-deleted",
      severity: "WARNING",
      title: "تم حذف تنبيه من التقويم",
      details: {
        reminderId: reminder.id,
        reminderTitle: reminder.title,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete calendar reminder:", error);

    return NextResponse.json(
      {
        success: false,
        error: "تعذر حذف التنبيه.",
      },
      { status: 500 },
    );
  }
}
