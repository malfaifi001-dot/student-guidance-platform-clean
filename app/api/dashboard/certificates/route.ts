import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import {
  getCertificateTypeLabel,
  getRecipientPrefix,
} from "@/lib/certificates/certificate-types";
import { getCertificateTemplateByKey } from "@/lib/certificates/certificate-template-registry";
import { DEFAULT_CERTIFICATE_TEMPLATE_KEY } from "@/lib/certificates/certificate-renderer";
import { buildCertificateIntro, buildCertificateRecognition } from "@/lib/certificates/certificate-copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TableColumn = {
  Field: string;
};

type CertificateListRow = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  reason: string | null;
  body: string | null;
  title: string;
  dataJson: string | null;
  issueDate: Date | string;
  status: string;
  pdfUrl: string | null;
  batchId: string | null;
  batchNumber: string | null;
  createdAt: Date | string;
};

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function randomPart() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function generateLocalCertificateNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  return `CERT-${date}-${randomPart()}`;
}

function normalizeIssueDate(value: unknown) {
  const raw = safeString(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00.000Z`);
  }

  const parsed = new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date();
}

function buildCertificateTitle(certificateType: string) {
  return `شهادة ${getCertificateTypeLabel(certificateType)}`;
}

function buildCertificateBody(data: {
  recipientName: string;
  recipientType: string;
  certificateType: string;
  reason: string;
}) {
  const typeLabel = getCertificateTypeLabel(data.certificateType);
  const prefix = getRecipientPrefix(data.recipientType);
  const name = data.recipientName || "المستفيد";
  const reason = data.reason;

  return `تتقدم إدارة المدرسة بخالص ${typeLabel} إلى ${prefix} ${name}، وذلك نظير ${reason}، سائلين الله له دوام التوفيق والتميز.`;
}

async function getTableColumns(tableName: "IssuedCertificate") {
  const rows = await certificatePrisma.$queryRawUnsafe<TableColumn[]>(
    `SHOW COLUMNS FROM ${tableName}`,
  );

  return new Set(rows.map((row) => row.Field));
}

async function insertDynamic(
  tableName: "IssuedCertificate",
  columns: Set<string>,
  data: Record<string, unknown>,
) {
  const entries = Object.entries(data).filter(([key]) => columns.has(key));

  if (!entries.length) {
    throw new Error(`NO_COLUMNS_FOR_${tableName}`);
  }

  const names = entries.map(([key]) => `\`${key}\``).join(", ");
  const placeholders = entries.map(() => "?").join(", ");
  const values = entries.map(([, value]) => value);

  await certificatePrisma.$executeRawUnsafe(
    `INSERT INTO ${tableName} (${names}) VALUES (${placeholders})`,
    ...values,
  );
}

export async function GET(request: Request) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() || "";
  const type = url.searchParams.get("type")?.trim() || "";
  const recipientType = url.searchParams.get("recipientType")?.trim() || "";

  const where: string[] = ["c.schoolAccountId = ?", "c.createdById = ?"];
  const params: unknown[] = [actor.schoolAccountId, actor.id];

  if (query) {
    const like = `%${query}%`;

    where.push(
      "(c.recipientName LIKE ? OR c.certificateNumber LIKE ? OR c.reason LIKE ?)",
    );
    params.push(like, like, like);
  }

  if (type) {
    where.push("c.certificateType = ?");
    params.push(type);
  }

  if (recipientType) {
    where.push("c.recipientType = ?");
    params.push(recipientType);
  }

  const whereSql = where.join(" AND ");

  const items = await certificatePrisma.$queryRawUnsafe<CertificateListRow[]>(
    `
    SELECT
      c.id,
      c.certificateNumber,
      c.certificateType,
      c.recipientType,
      c.recipientName,
      c.reason,
      c.body,
      c.title,
      c.issueDate,
      c.status,
      c.pdfUrl,
      c.batchId,
      b.batchNumber,
      c.createdAt,
      c.dataJson
    FROM IssuedCertificate c
    LEFT JOIN CertificateBatch b ON b.id = c.batchId
    WHERE ${whereSql}
    ORDER BY c.createdAt DESC
    LIMIT 150
    `,
    ...params,
  );

  const countRows = await certificatePrisma.$queryRawUnsafe<{ total: number | bigint }[]>(
    `
    SELECT COUNT(*) AS total
    FROM IssuedCertificate c
    WHERE ${whereSql}
    `,
    ...params,
  );

  return NextResponse.json({
    items,
    total: Number(countRows[0]?.total || 0),
  });
}

export async function POST(request: Request) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  let payload: any = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const recipientName = safeString(payload.recipientName);
  const recipientType = safeString(payload.recipientType) || "student";
  const certificateType = safeString(payload.certificateType) || "thanks";
  const templateKey =
    getCertificateTemplateByKey(safeString(payload.templateKey))?.key ||
    DEFAULT_CERTIFICATE_TEMPLATE_KEY;
  const reason = safeString(payload.reason);
  const issueDate = normalizeIssueDate(payload.issueDate);
  const title = buildCertificateTitle(certificateType);
  const schoolProfile = await certificatePrisma.schoolProfile.findUnique({
    where: { schoolAccountId: actor.schoolAccountId },
    select: { schoolName: true },
  });
  const introText = safeString(payload.introText) || buildCertificateIntro(schoolProfile?.schoolName || "");
  const bodyText = safeString(payload.bodyText || payload.body) || buildCertificateRecognition({
    recipientType,
    reason,
  });

  if (!recipientName) {
    return NextResponse.json(
      { error: "اسم المستفيد مطلوب." },
      { status: 400 },
    );
  }

  if (!reason) {
    return NextResponse.json(
      { error: "سبب التكريم مطلوب." },
      { status: 400 },
    );
  }

  const certificateId = randomUUID();
  const now = new Date();
  const certificateNumber = generateLocalCertificateNumber();
  const columns = await getTableColumns("IssuedCertificate");
  const signatureProfile = await getCertificateSignatureProfile(
    actor.schoolAccountId,
    actor.role,
    actor.name,
    actor.id,
  );

  await insertDynamic("IssuedCertificate", columns, {
    id: certificateId,
    schoolAccountId: actor.schoolAccountId,
    templateId: null,
    batchId: null,
    certificateNumber,
    recipientType,
    recipientName,
    studentId: safeString(payload.studentId) || null,
    nationalId: safeString(payload.nationalId) || null,
    grade: safeString(payload.grade) || null,
    classroom: safeString(payload.classroom) || null,
    certificateType,
    title,
    reason,
    body: bodyText,
    issueDate,
    issuedAt: now,
    issuedById: actor.id,
    createdById: actor.id,
    status: "ISSUED",
    pdfUrl: null,
    htmlSnapshot: null,
    dataJson: JSON.stringify({
      templateKey,
      introText,
      principalName:
        signatureProfile?.principalName ||
        "مدير المدرسة",
      principalSignatureUrl: signatureProfile?.principalSignatureUrl || "",
      issuerName:
        signatureProfile?.issuerName ||
        actor.name,
      issuerTitle: signatureProfile?.issuerTitle || "الموجه الطلابي",
      issuerSignatureUrl: signatureProfile?.issuerSignatureUrl || "",
    }),
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    certificate: {
      id: certificateId,
      certificateNumber,
    },
  });
}
