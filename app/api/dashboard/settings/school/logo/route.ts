import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function getExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";

  return null;
}

function validateLogoFile(file: File) {
  if (file.size <= 0) {
    return "ملف الشعار فارغ.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "حجم الشعار يجب ألا يتجاوز 2MB.";
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return "صيغة الشعار غير مدعومة. استخدم PNG أو JPG أو WEBP فقط.";
  }

  if (!getExtension(file)) {
    return "تعذر تحديد امتداد الشعار بشكل آمن.";
  }

  return null;
}

export async function POST(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("logo");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "ملف الشعار مطلوب.",
        },
        { status: 400 }
      );
    }

    const validationError = validateLogoFile(file);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        { status: 400 }
      );
    }

    const extension = getExtension(file);

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error: "صيغة الشعار غير مدعومة.",
        },
        { status: 400 }
      );
    }

    const school = await prisma.schoolAccount.findUnique({
      where: {
        id: authResult.schoolAccountId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!school) {
      return NextResponse.json(
        {
          success: false,
          error: "المدرسة غير موجودة.",
        },
        { status: 404 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "school-logos"
    );
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${authResult.schoolAccountId}-${crypto.randomUUID()}.${extension}`;
    const diskPath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/school-logos/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, buffer);

    await prisma.schoolProfile.upsert({
      where: {
        schoolAccountId: authResult.schoolAccountId,
      },
      update: {
        logoUrl: publicUrl,
      },
      create: {
        schoolAccountId: authResult.schoolAccountId,
        schoolName: school.name || "اسم المدرسة",
        logoUrl: publicUrl,
      },
    });

    return NextResponse.json({
      success: true,
      logoUrl: publicUrl,
      message: "تم رفع شعار المدرسة بنجاح.",
    });
  } catch (error) {
    console.error("SCHOOL_LOGO_UPLOAD_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "حدث خطأ أثناء رفع شعار المدرسة.",
      },
      { status: 500 }
    );
  }
}
