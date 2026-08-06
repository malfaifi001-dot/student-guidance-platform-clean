import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import {
  getTimetableRooms,
  saveTimetableRooms,
} from "@/lib/timetable/timetable-room-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

const roomSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(2).max(120),
  roomType: z.enum([
    "CLASSROOM",
    "SCIENCE_LAB",
    "COMPUTER_LAB",
    "GYM",
    "ART_ROOM",
    "RESOURCE_ROOM",
    "OTHER",
  ]),
  capacity: z.number().int().min(1).max(500).optional(),
  isActive: z.boolean(),
});

const roomsInputSchema = z.object({
  rooms: z.array(roomSchema).max(200),
});

export async function GET(
  _request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { projectId } = await context.params;

  const rooms = await getTimetableRooms(
    projectId,
    access.schoolAccountId!,
  );

  if (!rooms) {
    return NextResponse.json(
      {
        success: false,
        error: "مشروع الجدول غير موجود.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    rooms,
  });
}

export async function PUT(
  request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = roomsInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "بيانات الغرف غير صالحة.",
      },
      { status: 400 },
    );
  }

  const { projectId } = await context.params;

  const rooms = await saveTimetableRooms(
    projectId,
    access.schoolAccountId!,
    parsed.data.rooms,
  );

  if (!rooms) {
    return NextResponse.json(
      {
        success: false,
        error: "مشروع الجدول غير موجود.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    rooms,
  });
}