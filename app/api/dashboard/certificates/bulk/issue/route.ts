import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import {
  getCertificateTypeLabel,
  getRecipientPrefix,
} from "@/lib/certificates/certificate-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BulkIssueRow = {
  recipientName: string;
  recipientType: string;
  grade?: string;
  classroom?: string;
  nationalId?: string;
  certificateType: string;
  reason: string;
  issueDate: string;
  principalName?: string;
  issuerName?: string;
  studentId?: string | null;
};

type TableColumn = {
  Field: string;
};

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function randomPart() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function generateLocalCertificateNumber(index: number) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  return `CERT-${date}-${String(index + 1).padStart(3, "0")}-${randomPart()}`;
}

function generateLocalBatchNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  return `BATCH-${date}-${randomPart()}`;
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

function buildCertificateBody(row: BulkIssueRow) {
  const typeLabel = getCertificateTypeLabel(row.certificateType);
  const prefix = getRecipientPrefix(row.recipientType);
  const name = safeString(row.recipientName) || "المستفيد";
  const reason = safeString(row.reason);

  return `تتقدم إدارة المدرسة بخالص ${typeLabel} إلى ${prefix} ${name}، وذلك نظير ${reason}، سائلين الله له دوام التوفيق والتميز.`;
}

function cleanRows(rows: unknown[]) {
  return rows
    .map((item) => item as Partial<BulkIssueRow>)
    .map((row): BulkIssueRow => ({
      recipientName: safeString(row.recipientName),
      recipientType: safeString(row.recipientType) || "student",
      grade: safeString(row.grade),
      classroom: safeString(row.classroom),
      nationalId: safeString(row.nationalId),
      certificateType: safeString(row.certificateType) || "thanks",
      reason: safeString(row.reason),
      issueDate: safeString(row.issueDate) || new Date().toISOString().slice(0, 10),
      principalName: safeString(row.principalName),
      issuerName: safeString(row.issuerName),
      studentId: safeString(row.studentId) || null,
    }))
    .filter((row) => row.recipientName && row.reason);
}

async function getTableColumns(tx: any, tableName: "CertificateBatch" | "IssuedCertificate") {
  const rows = (await tx.$queryRawUnsafe(`SHOW COLUMNS FROM ${tableName}`)) as TableColumn[];

  return new Set(rows.map((row) => row.Field));
}

async function insertDynamic(
  tx: any,
  tableName: "CertificateBatch" | "IssuedCertificate",
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

  await tx.$executeRawUnsafe(
    `INSERT INTO ${tableName} (${names}) VALUES (${placeholders})`,
    ...values,
  );
}

export async function POST(request: Request) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  let body: any = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rows = cleanRows(Array.isArray(body.items) ? body.items : []);

  if (!rows.length) {
    return NextResponse.json(
      { error: "لا توجد شهادات صالحة للإصدار." },
      { status: 400 },
    );
  }

  if (rows.length > 500) {
    return NextResponse.json(
      { error: "الحد الأعلى للإصدار الجماعي هو 500 شهادة في الدفعة الواحدة." },
      { status: 400 },
    );
  }

  const source = safeString(body.source) || "manual";
  const batchId = randomUUID();
  const batchNumber = generateLocalBatchNumber();
  const now = new Date();
  const batchTitle =
    safeString(body.batchTitle) ||
    `دفعة شهادات - ${new Date().toISOString().slice(0, 10)}`;
  const signatureProfile = await getCertificateSignatureProfile(
    actor.schoolAccountId,
    actor.role,
    actor.name,
  );

  try {
    const result = await certificatePrisma.$transaction(async (tx) => {
      const batchColumns = await getTableColumns(tx, "CertificateBatch");
      const issuedColumns = await getTableColumns(tx, "IssuedCertificate");

      await insertDynamic(tx, "CertificateBatch", batchColumns, {
        id: batchId,
        schoolAccountId: actor.schoolAccountId,
        templateId: "cert_tpl_official_green",
        batchNumber,
        title: batchTitle,
        name: batchTitle,
        source,
        sourceType: source,
        status: "ISSUED",
        totalCount: rows.length,
        issuedCount: rows.length,
        failedCount: 0,
        createdById: actor.id,
        issuedById: actor.id,
        dataJson: JSON.stringify({
          source,
          createdByName: actor.name,
        }),
        metadataJson: JSON.stringify({
          source,
          createdByName: actor.name,
        }),
        createdAt: now,
        updatedAt: now,
      });

      const issued = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const certificateId = randomUUID();
        const certificateNumber = generateLocalCertificateNumber(index);
        const title = buildCertificateTitle(row.certificateType);
        const bodyText = buildCertificateBody(row);
        const issueDate = normalizeIssueDate(row.issueDate);

        await insertDynamic(tx, "IssuedCertificate", issuedColumns, {
          id: certificateId,
          schoolAccountId: actor.schoolAccountId,
          templateId: "cert_tpl_official_green",
          batchId,
          certificateNumber,
          recipientType: row.recipientType,
          recipientName: row.recipientName,
          studentId: row.studentId,
          nationalId: row.nationalId || null,
          grade: row.grade || null,
          classroom: row.classroom || null,
          certificateType: row.certificateType,
          title,
          reason: row.reason,
          body: bodyText,
          issueDate,
          issuedAt: now,
          issuedById: actor.id,
          createdById: actor.id,
          status: "ISSUED",
          pdfUrl: null,
          htmlSnapshot: null,
          dataJson: JSON.stringify({
            source,
            batchId,
            batchNumber,
            principalName:
              row.principalName ||
              signatureProfile?.principalName ||
              "مدير المدرسة",
            principalSignatureUrl:
              signatureProfile?.principalSignatureUrl || "",
            issuerName:
              row.issuerName ||
              signatureProfile?.issuerName ||
              actor.name,
            issuerTitle:
              signatureProfile?.issuerTitle || "الموجه الطلابي",
            issuerSignatureUrl:
              signatureProfile?.issuerSignatureUrl || "",
          }),
          createdAt: now,
          updatedAt: now,
        });

        issued.push({
          id: certificateId,
          certificateNumber,
          recipientName: row.recipientName,
        });
      }

      return {
        batch: {
          id: batchId,
          batchNumber,
          title: batchTitle,
          totalCount: rows.length,
          issuedCount: issued.length,
        },
        issued,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("BULK_CERTIFICATES_ISSUE_ERROR", error);

    return NextResponse.json(
      {
        error: "تعذر إصدار الدفعة.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
