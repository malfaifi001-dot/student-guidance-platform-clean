import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINK_FIELD_KEY = "report_attached_certificate_ids";

type ReportOptionRow = {
  id: string;
  title: string | null;
  status: string;
  serviceName: string | null;
  studentName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  linkedValue: string | null;
  linkedJsonValue: unknown;
};

type CertificateOptionRow = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientName: string;
  reason: string | null;
  issueDate: Date | string;
  createdAt: Date | string;
};

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function parseIds(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function readLinkedIds(row: ReportOptionRow) {
  return parseIds(row.linkedJsonValue).length
    ? parseIds(row.linkedJsonValue)
    : parseIds(row.linkedValue);
}

export async function GET(request: Request) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const url = new URL(request.url);
  const reportQuery = url.searchParams.get("reportQuery")?.trim() || "";
  const certificateQuery = url.searchParams.get("certificateQuery")?.trim() || "";

  const reportLike = `%${reportQuery}%`;
  const certificateLike = `%${certificateQuery}%`;

  const reports = await certificatePrisma.$queryRawUnsafe<ReportOptionRow[]>(
    `
    SELECT
      c.id,
      c.title,
      c.status,
      s.name AS serviceName,
      st.fullName AS studentName,
      c.createdAt,
      c.updatedAt,
      (
        SELECT cv.value
        FROM CaseValue cv
        WHERE cv.caseEntryId = c.id AND cv.fieldKey = ?
        ORDER BY cv.updatedAt DESC
        LIMIT 1
      ) AS linkedValue,
      (
        SELECT cv.jsonValue
        FROM CaseValue cv
        WHERE cv.caseEntryId = c.id AND cv.fieldKey = ?
        ORDER BY cv.updatedAt DESC
        LIMIT 1
      ) AS linkedJsonValue
    FROM CaseEntry c
    LEFT JOIN Service s ON s.id = c.serviceId
    LEFT JOIN Student st ON st.id = c.studentId
    WHERE c.schoolAccountId = ?
      AND (
        ? = ''
        OR c.title LIKE ?
        OR c.id LIKE ?
        OR s.name LIKE ?
        OR st.fullName LIKE ?
      )
    ORDER BY c.updatedAt DESC, c.createdAt DESC
    LIMIT 120
    `,
    LINK_FIELD_KEY,
    LINK_FIELD_KEY,
    actor.schoolAccountId,
    reportQuery,
    reportLike,
    reportLike,
    reportLike,
    reportLike,
  );

  const certificates = await certificatePrisma.$queryRawUnsafe<CertificateOptionRow[]>(
    `
    SELECT id, certificateNumber, certificateType, recipientName, reason, issueDate, createdAt
    FROM IssuedCertificate
    WHERE schoolAccountId = ?
      AND (
        ? = ''
        OR recipientName LIKE ?
        OR certificateNumber LIKE ?
        OR reason LIKE ?
      )
    ORDER BY createdAt DESC
    LIMIT 250
    `,
    actor.schoolAccountId,
    certificateQuery,
    certificateLike,
    certificateLike,
    certificateLike,
  );

  return NextResponse.json({
    reports: reports.map((report) => ({
      id: report.id,
      title: report.title,
      status: report.status,
      serviceName: report.serviceName,
      studentName: report.studentName,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      linkedCertificateIds: readLinkedIds(report),
    })),
    certificates,
  });
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

  const caseId = safeString(body.caseId);
  const requestedIds = Array.isArray(body.certificateIds)
    ? body.certificateIds.map(safeString).filter(Boolean)
    : [];

  if (!caseId) {
    return NextResponse.json(
      { error: "اختر التقرير أولًا." },
      { status: 400 },
    );
  }

  const caseRows = await certificatePrisma.$queryRawUnsafe<{ id: string }[]>(
    `
    SELECT id
    FROM CaseEntry
    WHERE id = ? AND schoolAccountId = ?
    LIMIT 1
    `,
    caseId,
    actor.schoolAccountId,
  );

  if (!caseRows.length) {
    return NextResponse.json(
      { error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه." },
      { status: 404 },
    );
  }

  let validIds: string[] = [];

  if (requestedIds.length) {
    const uniqueIds = Array.from(new Set(requestedIds));
    const placeholders = uniqueIds.map(() => "?").join(", ");

    const rows = await certificatePrisma.$queryRawUnsafe<{ id: string }[]>(
      `
      SELECT id
      FROM IssuedCertificate
      WHERE schoolAccountId = ? AND id IN (${placeholders})
      `,
      actor.schoolAccountId,
      ...uniqueIds,
    );

    const allowed = new Set(rows.map((row) => row.id));
    validIds = uniqueIds.filter((id) => allowed.has(id));
  }

  await certificatePrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `
      DELETE FROM CaseValue
      WHERE caseEntryId = ? AND fieldKey = ?
      `,
      caseId,
      LINK_FIELD_KEY,
    );

    if (validIds.length) {
      const json = JSON.stringify(validIds);

      await tx.$executeRawUnsafe(
        `
        INSERT INTO CaseValue
          (id, caseEntryId, fieldKey, value, jsonValue, createdAt, updatedAt)
        VALUES
          (?, ?, ?, ?, ?, NOW(), NOW())
        `,
        randomUUID(),
        caseId,
        LINK_FIELD_KEY,
        json,
        json,
      );
    }
  });

  return NextResponse.json({
    ok: true,
    caseId,
    certificateIds: validIds,
    linkedCount: validIds.length,
  });
}