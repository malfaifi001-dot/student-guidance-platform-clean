import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

function getExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/svg+xml") return "svg";

  const nameExtension = file.name.split(".").pop()?.toLowerCase();

  if (nameExtension && ["png", "jpg", "jpeg", "webp", "svg"].includes(nameExtension)) {
    return nameExtension === "jpeg" ? "jpg" : nameExtension;
  }

  return "png";
}

export async function POST(request: Request) {
  try {
    const current = await getCurrentSessionUser();

    if (!current || !current.user.schoolAccountId) {
      return NextResponse.json(
        { success: false, error: "يلزم تسجيل الدخول." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("logo");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "ملف الشعار مطلوب." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "صيغة الشعار غير مدعومة. استخدم PNG أو JPG أو WEBP أو SVG.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "حجم الشعار يجب ألا يتجاوز 2MB." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "school-logos");
    await mkdir(uploadDir, { recursive: true });

    const extension = getExtension(file);
    const fileName = `${current.user.schoolAccountId}-${Date.now()}.${extension}`;
    const diskPath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/school-logos/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, buffer);

    await prisma.schoolProfile.upsert({
      where: {
        schoolAccountId: current.user.schoolAccountId,
      },
      update: {
        logoUrl: publicUrl,
      },
      create: {
        schoolAccountId: current.user.schoolAccountId,
        schoolName:
          current.user.schoolAccount?.name || "اسم المدرسة",
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
      { success: false, error: "حدث خطأ أثناء رفع شعار المدرسة." },
      { status: 500 }
    );
  }
}
