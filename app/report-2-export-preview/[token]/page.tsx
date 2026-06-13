import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { ReportTwoPdfExportPreview } from "@/components/report-2/report-two-pdf-export-preview";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

function getReportTwoExportSnapshotDir() {
  return path.join(process.cwd(), ".tmp", "report-2-export");
}

function isSafeToken(value: string) {
  return /^[a-zA-Z0-9-]+$/.test(value);
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

export default async function ReportTwoExportPreviewPage({ params }: PageProps) {
  const { token } = await params;
  const snapshot = await readSnapshot(token);

  if (!snapshot?.template?.pages?.length) {
    notFound();
  }

  return <ReportTwoPdfExportPreview snapshot={snapshot} />;
}