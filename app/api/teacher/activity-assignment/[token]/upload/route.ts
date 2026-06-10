import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function safeFileName(value: string) {
  return String(value || "file")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function isExpired(date?: Date | null) {
  return Boolean(date && date.getTime() < Date.now());
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

  const assignment = await prisma.activityAssignment.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      status: true,
      tokenExpiresAt: true,
    },
  });

  if (!assignment || assignment.status === "CANCELED" || assignment.status === "SUBMITTED") {
    return NextResponse.json(
      {
        success: false,
        error: "الرابط غير صالح.",
      },
      { status: 404 },
    );
  }

  if (isExpired(assignment.tokenExpiresAt)) {
    return NextResponse.json(
      {
        success: false,
        error: "انتهت صلاحية الرابط.",
      },
      { status: 410 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم اختيار ملف.",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: "حجم الملف كبير. الحد الأعلى 10MB.",
      },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || "";
  const storedName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "activity-assignments", assignment.id);

  await mkdir(uploadDir, { recursive: true });

  const fullPath = path.join(uploadDir, storedName);

  await writeFile(fullPath, bytes);

  const fileUrl = `/uploads/activity-assignments/${assignment.id}/${storedName}`;

  return NextResponse.json({
    success: true,
    item: {
      id: crypto.randomUUID(),
      fileName: safeFileName(file.name),
      fileUrl,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    },
  });
}