import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import {
  getCertificateTypeLabel,
  getRecipientPrefix,
} from "@/lib/certificates/certificate-types";
import { DEFAULT_CERTIFICATE_TEMPLATE_KEY } from "@/lib/certificates/certificate-renderer";
import { buildCertificateIntro, buildCertificateRecognition } from "@/lib/certificates/certificate-copy";
import { activeCertificateTemplateRegistry } from "@/lib/certificates/certificate-template-registry";

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

function buildBulkIntro(schoolName: string, recipientType: string) {
  const school = schoolName || "\u0627\u0644\u0645\u062f\u0631\u0633\u0629";
  const recipient = recipientType === "student_female" ? "\u0627\u0644\u0637\u0627\u0644\u0628\u0629" : "\u0627\u0644\u0637\u0627\u0644\u0628";
  return "\u062a\u062a\u0642\u062f\u0645 \u0625\u062f\u0627\u0631\u0629 \u0645\u062f\u0631\u0633\u0629 " + school + " \u0628\u062e\u0627\u0644\u0635 \u0627\u0644\u0634\u0643\u0631 \u0648\u0627\u0644\u062a\u0642\u062f\u064a\u0631 \u0625\u0644\u0649 " + recipient;
}

function buildBulkBody(reason: string, recipientType: string) {
  const feminine = recipientType === "student_female";
  return "\u062a\u0642\u062f\u064a\u0631\u064b\u0627 " + (feminine ? "\u0644\u062c\u0647\u0648\u062f\u0647\u0627 \u0648\u062a\u0645\u064a\u0632\u0647\u0627" : "\u0644\u062c\u0647\u0648\u062f\u0647 \u0648\u062a\u0645\u064a\u0632\u0647") + " \u0641\u064a " + reason + "\u060c \u0645\u0639 \u0623\u0637\u064a\u0628 \u0627\u0644\u0623\u0645\u0646\u064a\u0627\u062a " + (feminine ? "\u0644\u0647\u0627" : "\u0644\u0647") + " \u0628\u062f\u0648\u0627\u0645 \u0627\u0644\u062a\u0648\u0641\u064a\u0642 \u0648\u0627\u0644\u0646\u062c\u0627\u062d.";
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

  const schoolProfile = await certificatePrisma.schoolProfile.findUnique({
    where: { schoolAccountId: actor.schoolAccountId },
    select: { schoolName: true },
  });

  let body: any = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const batchRecipientType = body.recipientType === "student_female" ? "student_female" : "student";
  const requestedTemplateKey = safeString(body.templateKey);
  const templateKey = activeCertificateTemplateRegistry.some((template) => template.key === requestedTemplateKey)
    ? requestedTemplateKey
    : DEFAULT_CERTIFICATE_TEMPLATE_KEY;
  const rows = cleanRows(Array.isArray(body.items) ? body.items : []).map((row) => ({
    ...row,
    recipientType: batchRecipientType,
  }));

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
    actor.id,
  );

  try {
    const result = await certificatePrisma.$transaction(async (tx) => {
      const batchColumns = await getTableColumns(tx, "CertificateBatch");
      const issuedColumns = await getTableColumns(tx, "IssuedCertificate");

      await insertDynamic(tx, "CertificateBatch", batchColumns, {
        id: batchId,
        schoolAccountId: actor.schoolAccountId,
        templateId: templateKey,
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
        const bodyText = buildBulkBody(row.reason, batchRecipientType);
        const introText = buildBulkIntro(schoolProfile?.schoolName || "", batchRecipientType);
        const issueDate = normalizeIssueDate(row.issueDate);

        await insertDynamic(tx, "IssuedCertificate", issuedColumns, {
          id: certificateId,
          schoolAccountId: actor.schoolAccountId,
          templateId: null,
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
            templateKey,
            introText,
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
