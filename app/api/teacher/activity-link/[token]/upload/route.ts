import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeDurableUpload } from "@/lib/storage/durable-upload-storage";

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

  const link = await prisma.teacherActivityLink.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      status: true,
      tokenExpiresAt: true,
    },
  });

  if (!link || link.status === "CLOSED" || link.status === "EXPIRED") {
    return NextResponse.json(
      { success: false, error: "الرابط غير صالح." },
      { status: 404 },
    );
  }

  if (isExpired(link.tokenExpiresAt)) {
    return NextResponse.json(
      { success: false, error: "انتهت صلاحية الرابط." },
      { status: 410 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const rawDraftId = String(formData.get("draftId") || "").trim();

  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(rawDraftId)) {
    return NextResponse.json(
      { success: false, error: "معرّف الجلسة غير صالح." },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "لم يتم اختيار ملف." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: "حجم الملف كبير. الحد الأعلى 10MB." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const rawExtension = path.extname(file.name).slice(1).toLowerCase();
  const extension = /^[a-z0-9]{1,10}$/.test(rawExtension) ? `.${rawExtension}` : "";
  const storedName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  const fileUrl = await writeDurableUpload(
    "teacher-activity-submissions",
    rawDraftId,
    storedName,
    new Uint8Array(bytes),
  );

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
