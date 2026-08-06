import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  TimetableRoom,
} from "@/lib/timetable/timetable-constraint-types";

export async function getTimetableRooms(
  projectId: string,
  schoolAccountId: string,
) {
  const project = await prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    select: {
      id: true,
      settingsJson: true,
    },
  });

  if (!project) {
    return null;
  }

  const settings = normalizeRecord(project.settingsJson);

  return normalizeRooms(settings.rooms);
}

export async function saveTimetableRooms(
  projectId: string,
  schoolAccountId: string,
  rooms: TimetableRoom[],
) {
  const project = await prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    select: {
      id: true,
      settingsJson: true,
    },
  });

  if (!project) {
    return null;
  }

  const settings = normalizeRecord(project.settingsJson);

  await prisma.timetableProject.update({
    where: {
      id: project.id,
    },
    data: {
      settingsJson: {
        ...settings,
        rooms,
        roomsUpdatedAt: new Date().toISOString(),
      },
    },
  });

  return rooms;
}

function normalizeRooms(value: unknown): TimetableRoom[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const id = String(record.id || "");
    const name = String(record.name || "");

    if (!id || !name) {
      return [];
    }

    return [{
      id,
      name,
      roomType: normalizeRoomType(record.roomType),
      capacity:
        typeof record.capacity === "number"
          ? record.capacity
          : undefined,
      isActive: record.isActive !== false,
    }];
  });
}

function normalizeRoomType(
  value: unknown,
): TimetableRoom["roomType"] {
  const allowed: TimetableRoom["roomType"][] = [
    "CLASSROOM",
    "SCIENCE_LAB",
    "COMPUTER_LAB",
    "GYM",
    "ART_ROOM",
    "RESOURCE_ROOM",
    "OTHER",
  ];

  return allowed.includes(
    value as TimetableRoom["roomType"],
  )
    ? value as TimetableRoom["roomType"]
    : "OTHER";
}

function normalizeRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}