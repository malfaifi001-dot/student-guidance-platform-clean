import { NextResponse } from "next/server";

import { logPlatformActivity } from "@/lib/admin/activity-log";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

function asCleanString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizePriority(value: unknown) {
  const priority = asCleanString(value);

  if (priority === "URGENT" || priority === "IMPORTANT" || priority === "NORMAL") {
    return priority;
  }

  return "NORMAL";
}

function normalizeLinkType(value: unknown) {
  const linkType = asCleanString(value);

  if (
    linkType === "GENERAL" ||
    linkType === "SERVICE" ||
    linkType === "CASE" ||
    linkType === "STUDENT"
  ) {
    return linkType;
  }

  return "GENERAL";
}

async function validateLinkedResource(input: {
  schoolAccountId: string;
  linkType: string;
  serviceId?: string | null;
  caseEntryId?: string | null;
  studentId?: string | null;
}) {
  if (input.linkType === "GENERAL") return null;

  if (input.linkType === "SERVICE") {
    if (!input.serviceId) return "اختر الخدمة المرتبطة بالتنبيه.";

    const service = await prisma.service.findUnique({
      where: {
        id: input.serviceId,
      },
      select: {
        id: true,
      },
    });

    return service ? null : "الخدمة غير موجودة.";
  }

  if (input.linkType === "CASE") {
    if (!input.caseEntryId) return "اختر الحالة المرتبطة بالتنبيه.";

    const caseEntry = await prisma.caseEntry.findFirst({
      where: {
        id: input.caseEntryId,
        schoolAccountId: input.schoolAccountId,
      },
      select: {
        id: true,
      },
    });

    return caseEntry ? null : "الحالة غير موجودة أو لا تتبع مدرستك.";
  }

  if (input.linkType === "STUDENT") {
    if (!input.studentId) return "اختر الطالب المرتبط بالتنبيه.";

    const student = await prisma.student.findFirst({
      where: {
        id: input.studentId,
        schoolAccountId: input.schoolAccountId,
      },
      select: {
        id: true,
      },
    });

    return student ? null : "الطالب غير موجود أو لا يتبع مدرستك.";
  }

  return null;
}

export async function POST(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const body = await request.json();

    const title = asCleanString(body?.title);
    const note = asCleanString(body?.note);
    const linkType = normalizeLinkType(body?.linkType);
    const priority = normalizePriority(body?.priority);
    const scheduledAt = new Date(asCleanString(body?.scheduledAt));
    const remindBeforeMinutes = Number(body?.remindBeforeMinutes || 0);

    const serviceId = asCleanString(body?.serviceId) || null;
    const caseEntryId = asCleanString(body?.caseEntryId) || null;
    const studentId = asCleanString(body?.studentId) || null;

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "عنوان التنبيه مطلوب.",
        },
        { status: 400 },
      );
    }

    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "وقت التنبيه غير صحيح.",
        },
        { status: 400 },
      );
    }

    const linkedError = await validateLinkedResource({
      schoolAccountId: authResult.schoolAccountId,
      linkType,
      serviceId,
      caseEntryId,
      studentId,
    });

    if (linkedError) {
      return NextResponse.json(
        {
          success: false,
          error: linkedError,
        },
        { status: 400 },
      );
    }

    const reminder = await prisma.calendarReminder.create({
      data: {
        schoolAccountId: authResult.schoolAccountId,
        createdById: authResult.user.id,
        title,
        note: note || null,
        priority,
        linkType,
        scheduledAt,
        remindBeforeMinutes: Number.isFinite(remindBeforeMinutes)
          ? remindBeforeMinutes
          : 0,
        serviceId: linkType === "SERVICE" ? serviceId : null,
        caseEntryId: linkType === "CASE" ? caseEntryId : null,
        studentId: linkType === "STUDENT" ? studentId : null,
      },
    });

    await logPlatformActivity({
      actorUserId: authResult.user.id,
      schoolAccountId: authResult.schoolAccountId,
      category: "CALENDAR",
      action: "calendar-reminder-created",
      severity: "SUCCESS",
      title: "تم إنشاء تنبيه في التقويم",
      details: {
        reminderId: reminder.id,
        reminderTitle: reminder.title,
        linkType,
        priority,
        scheduledAt: reminder.scheduledAt.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      reminder,
    });
  } catch (error) {
    console.error("Failed to create calendar reminder:", error);

    return NextResponse.json(
      {
        success: false,
        error: "تعذر إنشاء التنبيه.",
      },
      { status: 500 },
    );
  }
}
