import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Eye,
  FileText,
  Users,
} from "lucide-react";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import {
  getCertificateTypeLabel,
  getRecipientPrefix,
} from "@/lib/certificates/certificate-types";
import {
  BatchPdfDownloadButton,
  CertificatePdfDownloadButton,
} from "@/components/certificates/certificate-batch-details-actions";

type PageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

type TableColumn = {
  Field: string;
};

type BatchRow = {
  id: string;
  batchNumber: string | null;
  title: string | null;
  source: string | null;
  status: string | null;
  totalCount: number | bigint | null;
  issuedCount: number | bigint | null;
  createdAt: Date | string;
};

type CertificateRow = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  nationalId: string | null;
  grade: string | null;
  classroom: string | null;
  reason: string | null;
  title: string | null;
  issueDate: Date | string;
  status: string;
  pdfUrl: string | null;
  createdAt: Date | string;
};

async function getColumns(tableName: "CertificateBatch" | "IssuedCertificate") {
  const rows = await prisma.$queryRawUnsafe<TableColumn[]>(
    `SHOW COLUMNS FROM ${tableName}`,
  );

  return new Set(rows.map((row) => row.Field));
}

function selectColumn(
  columns: Set<string>,
  column: string,
  alias = column,
  fallback = "NULL",
) {
  if (columns.has(column)) {
    return `\`${column}\` AS \`${alias}\``;
  }

  return `${fallback} AS \`${alias}\``;
}

function selectFirstAvailable(
  columns: Set<string>,
  candidates: string[],
  alias: string,
  fallback = "NULL",
) {
  const found = candidates.find((column) => columns.has(column));

  if (found) {
    return `\`${found}\` AS \`${alias}\``;
  }

  return `${fallback} AS \`${alias}\``;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "غير محدد";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function formatCount(value: number | bigint | null | undefined) {
  return new Intl.NumberFormat("ar-SA").format(Number(value || 0));
}

function getStatusLabel(status: string | null | undefined) {
  if (status === "ISSUED") return "مصدرة";
  if (status === "DRAFT") return "مسودة";
  if (status === "CANCELED") return "ملغاة";

  return status || "مصدرة";
}

async function getBatch(batchId: string, schoolAccountId: string, createdById: string) {
  const columns = await getColumns("CertificateBatch");

  const select = [
    selectColumn(columns, "id"),
    selectColumn(columns, "batchNumber"),
    selectFirstAvailable(columns, ["title", "name"], "title", "'دفعة شهادات'"),
    selectFirstAvailable(columns, ["source", "sourceType"], "source", "'إصدار جماعي'"),
    selectColumn(columns, "status", "status", "'ISSUED'"),
    selectColumn(columns, "totalCount", "totalCount", "0"),
    selectColumn(columns, "issuedCount", "issuedCount", "0"),
    selectColumn(columns, "createdAt", "createdAt", "NOW()"),
  ].join(", ");

  const rows = await prisma.$queryRawUnsafe<BatchRow[]>(
    `
    SELECT ${select}
    FROM CertificateBatch
    WHERE id = ? AND schoolAccountId = ? AND createdById = ?
    LIMIT 1
    `,
    batchId,
    schoolAccountId,
    createdById,
  );

  return rows[0] || null;
}

async function getCertificates(batchId: string, schoolAccountId: string, createdById: string) {
  const columns = await getColumns("IssuedCertificate");

  const select = [
    selectColumn(columns, "id"),
    selectColumn(columns, "certificateNumber"),
    selectColumn(columns, "certificateType", "certificateType", "'thanks'"),
    selectColumn(columns, "recipientType", "recipientType", "'student'"),
    selectColumn(columns, "recipientName"),
    selectColumn(columns, "nationalId"),
    selectColumn(columns, "grade"),
    selectColumn(columns, "classroom"),
    selectColumn(columns, "reason"),
    selectColumn(columns, "title", "title", "NULL"),
    selectColumn(columns, "issueDate", "issueDate", "createdAt"),
    selectColumn(columns, "status", "status", "'ISSUED'"),
    selectColumn(columns, "pdfUrl"),
    selectColumn(columns, "createdAt", "createdAt", "NOW()"),
  ].join(", ");

  const rows = await prisma.$queryRawUnsafe<CertificateRow[]>(
    `
    SELECT ${select}
    FROM IssuedCertificate
    WHERE batchId = ? AND schoolAccountId = ? AND createdById = ?
    ORDER BY recipientName ASC, createdAt ASC
    `,
    batchId,
    schoolAccountId,
    createdById,
  );

  return rows;
}

export default async function CertificateBatchDetailsPage({ params }: PageProps) {
  const current = await requireDashboardUser();

  if (!current.user.schoolAccountId) {
    redirect("/dashboard");
  }

  const { batchId } = await params;
  const [batch, certificates] = await Promise.all([
    getBatch(batchId, current.user.schoolAccountId, current.user.id),
    getCertificates(batchId, current.user.schoolAccountId, current.user.id),
  ]);

  if (!batch || !certificates.length) {
    notFound();
  }

  const batchNumber = batch.batchNumber || batch.id;
  const createdAtIso = toIso(batch.createdAt);
  const issuedCount = certificates.length;
  const pdfReadyCount = certificates.filter((item) => Boolean(item.pdfUrl)).length;

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-4 text-white shadow-xl sm:rounded-[2.5rem] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">
              Certificates Batch
            </p>

            <h1 className="mt-3 text-2xl font-black sm:text-4xl">تفاصيل دفعة الشهادات</h1>

            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              راجع شهادات الدفعة، حمّلها كاملة، أو حمّل شهادة فردية عند الحاجة.
            </p>
          </div>

          <Link
            href="/dashboard/certificates"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للأرشيف
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<FileText className="h-5 w-5" />}
          label="رقم الدفعة"
          value={batchNumber}
        />

        <Metric
          icon={<Users className="h-5 w-5" />}
          label="عدد الشهادات"
          value={formatCount(issuedCount)}
        />

        <Metric
          icon={<Download className="h-5 w-5" />}
          label="PDF فردي جاهز"
          value={formatCount(pdfReadyCount)}
        />

        <Metric
          icon={<CalendarDays className="h-5 w-5" />}
          label="تاريخ الإنشاء"
          value={formatDate(batch.createdAt)}
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs font-black text-sky-700">بيانات الدفعة</p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {batch.title || "دفعة شهادات"}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                {getStatusLabel(batch.status)}
              </span>

              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                المصدر: {batch.source || "إصدار جماعي"}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                رقم الدفعة: {batchNumber}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/certificate-batch-preview/${batch.id}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Eye className="h-4 w-4" />
              معاينة الطباعة
            </Link>

            <BatchPdfDownloadButton
              batchId={batch.id}
              batchNumber={batchNumber}
              createdAt={createdAtIso}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">الشهادات</p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              قائمة المستفيدين
            </h2>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              كل شهادة يمكن عرضها أو تحميلها بشكل مستقل.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {certificates.map((certificate) => {
            const issueDateIso = toIso(certificate.issueDate);

            return (
              <article
                key={certificate.id}
                className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-white hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                    {getStatusLabel(certificate.status)}
                  </span>

                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                    {getCertificateTypeLabel(certificate.certificateType)}
                  </span>

                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                    {getRecipientPrefix(certificate.recipientType)}
                  </span>
                </div>

                <h3 className="mt-3 text-xl font-black leading-8 text-slate-950">
                  {certificate.recipientName}
                </h3>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  رقم الشهادة: {certificate.certificateNumber}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  تاريخ الإصدار: {formatDate(certificate.issueDate)}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-400">
                  {certificate.grade || "بدون صف"} · {certificate.classroom || "بدون فصل"}
                </p>

                <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-xs font-black leading-6 text-slate-500 ring-1 ring-slate-100">
                  سبب التكريم: {certificate.reason || "غير محدد"}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <Link
                    href={`/certificate-preview/${certificate.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    عرض
                  </Link>

                  <CertificatePdfDownloadButton
                    certificateId={certificate.id}
                    certificateType={certificate.certificateType}
                    recipientName={certificate.recipientName}
                    issueDate={issueDateIso}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-1 truncate text-xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </article>
  );
}
