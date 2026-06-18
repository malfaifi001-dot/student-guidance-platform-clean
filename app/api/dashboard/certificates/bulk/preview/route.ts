import { NextResponse } from "next/server";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import { parseBulkCertificatesExcel } from "@/lib/certificates/certificate-bulk-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isExcelFile(fileName: string) {
  return /\.(xlsx|xls)$/i.test(fileName);
}

export async function POST(request: Request) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const formData = await request.formData();
  const uploaded = formData.get("file");

  if (!uploaded || typeof uploaded === "string" || typeof uploaded.arrayBuffer !== "function") {
    return NextResponse.json(
      { error: "ارفع ملف Excel أولًا." },
      { status: 400 },
    );
  }

  const file = uploaded as File;
  const fileName = file.name || "certificates.xlsx";

  if (!isExcelFile(fileName)) {
    return NextResponse.json(
      { error: "صيغة الملف غير مدعومة. ارفع ملف xlsx أو xls." },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  const rows = parseBulkCertificatesExcel(buffer);

  return NextResponse.json({
    items: rows,
    total: rows.length,
    validCount: rows.filter((item) => item.isValid).length,
    invalidCount: rows.filter((item) => !item.isValid).length,
  });
}