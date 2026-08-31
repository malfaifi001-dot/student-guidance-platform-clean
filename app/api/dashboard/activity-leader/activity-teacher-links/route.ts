import crypto from "node:crypto";
import { NextResponse } from "next/server";

import {
  buildTeacherActivityLinkPublicUrl,
  buildTeacherActivityLinkMessage,
} from "@/lib/activity-programs/teacher-activity-link-helpers";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { dispatchAutomaticPushEvent } from "@/lib/notifications/push-center-service";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

function getOrigin(request: Request) {
  return (
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NODE_ENV === "production" ? "https://teachix.sa" : "http://localhost:3000"
  );
}

function parseDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function submitStatusCounts(submissions: { status: string }[]) {
  return {
    total: submissions.length,
    submitted: submissions.filter((item) => item.status === "SUBMITTED").length,
    returned: submissions.filter((item) => item.status === "RETURNED").length,
    approved: submissions.filter((item) => item.status === "APPROVED").length,
    canceled: submissions.filter((item) => item.status === "CANCELED").length,
  };
}

export async function GET(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (authResult.user.role !== "ACTIVITY_LEADER" && authResult.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "هذه العملية مخصصة لرائد النشاط." },
      { status: 403 },
    );
  }

  const guard = await requireServiceAccessApi("activity-programs");
  if (guard) return guard;

  const origin = getOrigin(request);

  const links = await prisma.teacherActivityLink.findMany({
    where: {
      schoolAccountId: authResult.schoolAccountId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      schoolAccount: {
        include: {
          profile: true,
        },
      },
      submissions: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    links: links.map((link) => ({
      id: link.id,
      title: link.title,
      note: link.note,
      status: link.status,
      token: link.token,
      publicUrl: buildTeacherActivityLinkPublicUrl(origin, link.token),
      tokenExpiresAt: link.tokenExpiresAt,
      closedAt: link.closedAt,
      submissionCounts: submitStatusCounts(link.submissions),
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (authResult.user.role !== "ACTIVITY_LEADER" && authResult.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "هذه العملية مخصصة لرائد النشاط." },
      { status: 403 },
    );
  }

  const guard = await requireServiceAccessApi("activity-programs");
  if (guard) return guard;

  const body = await request.json().catch(() => null);

  const title = String(body?.title || "").trim();
  const note = String(body?.note || "").trim() || null;
  const dueDate = parseDate(body?.dueDate);

  if (!title) {
    return NextResponse.json(
      { success: false, error: "عنوان الرابط مطلوب." },
      { status: 400 },
    );
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenExpiresAt = dueDate ? addDays(dueDate, 30) : addDays(new Date(), 180);

  const link = await prisma.teacherActivityLink.create({
    data: {
      schoolAccountId: authResult.schoolAccountId,
      createdById: authResult.user.id,
      title,
      note,
      token,
      tokenExpiresAt,
      status: "ACTIVE",
    },
    include: {
      schoolAccount: {
        include: {
          profile: true,
        },
      },
    },
  });

  void dispatchAutomaticPushEvent({ triggerKey: "activity-teacher-link-created", actorUserId: authResult.user.id, sourceRecordId: link.id, variables: { linkTitle: link.title, serviceName: "أنشطة الطلاب" } }).catch(() => undefined);

  const origin = getOrigin(request);
  const publicUrl = buildTeacherActivityLinkPublicUrl(origin, link.token);
  const schoolName = link.schoolAccount.profile?.schoolName || link.schoolAccount.name;
  const shareMessage = buildTeacherActivityLinkMessage({
    schoolName,
    title: link.title,
    note: link.note,
    dueDate: link.tokenExpiresAt,
    url: publicUrl,
  });

  return NextResponse.json({
    success: true,
    link: {
      id: link.id,
      title: link.title,
      note: link.note,
      status: link.status,
      publicUrl,
      shareMessage,
    },
    message: "تم إنشاء رابط النشاط المفتوح بنجاح.",
  });
}
