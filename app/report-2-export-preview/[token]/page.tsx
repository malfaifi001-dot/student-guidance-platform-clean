import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { ReportTwoPdfExportPreview } from "@/components/report-2/report-two-pdf-export-preview";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    print?: string;
    pdf?: string;
  }>;
};

function getReportTwoExportSnapshotDir() {
  return path.join(process.cwd(), ".tmp", "report-2-export");
}

function isSafeToken(value: string) {
  return /^[a-zA-Z0-9-]+$/.test(value);
}

function getLinkedAttachmentsHtml(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") {
    return "";
  }

  const value = (snapshot as Record<string, unknown>).__linkedAttachmentsHtml;

  return typeof value === "string" ? value : "";
}

async function readSnapshot(token: string) {
  if (!isSafeToken(token)) return null;

  try {
    const filePath = path.join(getReportTwoExportSnapshotDir(), `${token}.json`);
    const raw = await fs.readFile(filePath, "utf8");

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function ReportTwoExportPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const { print } = await searchParams;
  const snapshot = await readSnapshot(token);

  if (!snapshot?.template?.pages?.length) {
    notFound();
  }

  const linkedAttachmentsHtml = getLinkedAttachmentsHtml(snapshot);

  return (
    <>
      <ReportTwoPdfExportPreview snapshot={snapshot} printMode={print === "1"} />

      {linkedAttachmentsHtml.trim() ? (
        <section
          data-report-linked-attachments="1"
          dangerouslySetInnerHTML={{
            __html: linkedAttachmentsHtml,
          }}
        />
      ) : null}
    </>
  );
}
