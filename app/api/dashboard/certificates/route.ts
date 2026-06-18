import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import {
  buildCertificateTitle,
  normalizeCertificateDraft,
} from "@/lib/certificates/certificate-copy";
import { generateCertificateNumber } from "@/lib/certificates/certificate-number";

export const runtime = "nodejs";

type IssuedCertificateRow = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  reason: string | null;
  title: string;
  issueDate: Date;
  status: string;
  pdfUrl: string | null;
  createdAt: Date;
};

type CountRow = {
  total: bigint | number;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function GET(request: Request) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() || "";
  const certificateType = url.searchParams.get("type")?.trim() || "";
  const recipientType = url.searchParams.get("recipientType")?.trim() || "";

  const whereParts = ["schoolAccountId = ?"];
  const params: unknown[] = [actor.schoolAccountId];

  if (certificateType) {
    whereParts.push("certificateType = ?");
    params.push(certificateType);
  }

  if (recipientType) {
    whereParts.push("recipientType = ?");
    params.push(recipientType);
  }

  if (query) {
    whereParts.push("(certificateNumber LIKE ? OR recipientName LIKE ? OR reason LIKE ? OR title LIKE ?)");
    const like = `%${query}%`;
    params.push(like, like, like, like);
  }

  const whereSql = whereParts.join(" AND ");

  const items = await certificatePrisma.$queryRawUnsafe<IssuedCertificateRow[]>(
    `
    SELECT id, certificateNumber, certificateType, recipientType, recipientName,
           reason, title, issueDate, status, pdfUrl, createdAt
    FROM IssuedCertificate
    WHERE ${whereSql}
    ORDER BY createdAt DESC
    LIMIT 50
    `,
    ...params,
  );

  const countRows = await certificatePrisma.$queryRawUnsafe<CountRow[]>(
    `SELECT COUNT(*) AS total FROM IssuedCertificate WHERE ${whereSql}`,
    ...params,
  );

  const totalValue = countRows[0]?.total ?? 0;

  return NextResponse.json({
    items,
    total: typeof totalValue === "bigint" ? Number(totalValue) : totalValue,
  });
}

export async function POST(request: Request) {
  try {
    const actor = await getCertificateActor();

    if (!actor) {
      return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
    }

    const payload = normalizeCertificateDraft(await request.json());

    if (!payload.recipientName) {
      return NextResponse.json(
        { error: "اسم المستفيد مطلوب." },
        { status: 400 },
      );
    }

    const id = createId("cert");
    const certificateNumber = generateCertificateNumber();
    const issueDate = new Date(payload.issueDate);
    const safeIssueDate = Number.isNaN(issueDate.getTime()) ? new Date() : issueDate;

    const dataJson = JSON.stringify({
      grade: payload.grade || null,
      classroom: payload.classroom || null,
      issuerName: payload.issuerName || actor.name,
      principalName: payload.principalName || null,
    });

    await certificatePrisma.$executeRawUnsafe(
      `
      INSERT INTO IssuedCertificate (
        id,
        certificateNumber,
        schoolAccountId,
        createdById,
        templateId,
        batchId,
        certificateType,
        recipientType,
        recipientName,
        recipientIdentity,
        recipientStudentId,
        title,
        reason,
        body,
        issueDate,
        status,
        sourceType,
        sourceId,
        pdfUrl,
        htmlSnapshot,
        dataJson,
        createdAt,
        updatedAt
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', 'MANUAL', NULL, NULL, NULL, ?, NOW(3), NOW(3))
      `,
      id,
      certificateNumber,
      actor.schoolAccountId,
      actor.id,
      "cert_tpl_official_green",
      payload.certificateType,
      payload.recipientType,
      payload.recipientName,
      payload.recipientIdentity || null,
      payload.recipientStudentId || null,
      buildCertificateTitle(payload.certificateType),
      payload.reason || null,
      payload.body || "",
      safeIssueDate,
      dataJson,
    );

    return NextResponse.json({
      ok: true,
      certificate: {
        id,
        certificateNumber,
      },
      redirectTo: "/dashboard/certificates",
    });
  } catch (error) {
    console.error("CERTIFICATE_ISSUE_ERROR", error);

    return NextResponse.json(
      { error: "تعذر إصدار الشهادة." },
      { status: 500 },
    );
  }
}