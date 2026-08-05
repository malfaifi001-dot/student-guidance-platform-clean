import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { requireOwnedPortfolio } from "@/lib/portfolio/portfolio-authorization";
import {
  PORTFOLIO_IMAGE_MAX_BYTES,
  validatePortfolioImageFile,
  type PortfolioImageMimeType,
} from "@/lib/portfolio/portfolio-image-upload";

export const runtime = "nodejs";
type Context = { params: Promise<{ portfolioId: string }> };

function hasValidImageSignature(buffer: Buffer, mimeType: PortfolioImageMimeType) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId } = await context.params;
    const portfolio = await requireOwnedPortfolio(user, portfolioId);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > PORTFOLIO_IMAGE_MAX_BYTES + 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "حجم طلب رفع الصورة أكبر من الحد المسموح." }, { status: 413 });
    }
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "اختر صورة لرفعها." }, { status: 400 });
    }
    const validationError = validatePortfolioImageFile(file);
    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
    }

    const mimeType = file.type as PortfolioImageMimeType;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(buffer, mimeType)) {
      return NextResponse.json({ ok: false, error: "محتوى الصورة لا يطابق صيغتها المعلنة." }, { status: 400 });
    }

    const root = path.resolve(process.cwd(), "public", "uploads", "portfolio");
    const portfolioDirectory = path.resolve(root, portfolio.id);
    if (!portfolioDirectory.startsWith(`${root}${path.sep}`)) {
      return NextResponse.json({ ok: false, error: "مسار رفع الصورة غير صالح." }, { status: 400 });
    }
    await mkdir(portfolioDirectory, { recursive: true });
    let safeImage: Buffer;
    try {
      safeImage = await sharp(buffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .webp({ quality: 90 })
        .toBuffer();
    } catch {
      return NextResponse.json({ ok: false, error: "تعذر قراءة الصورة أو أن محتواها غير صالح." }, { status: 400 });
    }
    const fileName = `${randomUUID()}.webp`;
    const diskPath = path.resolve(portfolioDirectory, fileName);
    if (!diskPath.startsWith(`${portfolioDirectory}${path.sep}`)) {
      return NextResponse.json({ ok: false, error: "مسار حفظ الصورة غير صالح." }, { status: 400 });
    }
    await writeFile(diskPath, safeImage, { flag: "wx" });

    return NextResponse.json({
      ok: true,
      attachmentUrl: `/uploads/portfolio/${portfolio.id}/${fileName}`,
      attachmentMimeType: "image/webp" as const,
      attachmentKind: "IMAGE" as const,
    });
  } catch (error) {
    return portfolioApiError(error);
  }
}
