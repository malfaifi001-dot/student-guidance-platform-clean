import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files");

  const uploadedItems = [];

  const uploadDir = path.join(process.cwd(), "public", "uploads", "evidence");
  await mkdir(uploadDir, { recursive: true });

  for (const file of files) {
    if (!(file instanceof File)) continue;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = file.name.replace(/[^\w.\-\u0600-\u06FF]/g, "_");
    const storedName = `${Date.now()}-${safeName}`;
    const storedPath = path.join(uploadDir, storedName);

    await writeFile(storedPath, buffer);

    uploadedItems.push({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileUrl: `/uploads/evidence/${storedName}`,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  }

  return NextResponse.json({
    items: uploadedItems,
  });
}