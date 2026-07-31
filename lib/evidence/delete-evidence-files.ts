import "server-only";

import { unlink } from "fs/promises";
import path from "path";

const EVIDENCE_PUBLIC_PREFIX = "/uploads/evidence/";

function resolveEvidencePath(fileUrl: string) {
  if (!fileUrl.startsWith(EVIDENCE_PUBLIC_PREFIX)) return null;

  const storedName = path.posix.basename(fileUrl);
  if (!storedName || storedName !== fileUrl.slice(EVIDENCE_PUBLIC_PREFIX.length)) {
    return null;
  }

  const root = path.resolve(process.cwd(), "public", "uploads", "evidence");
  const resolved = path.resolve(root, storedName);
  const relative = path.relative(root, resolved);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

export async function deleteEvidenceFiles(fileUrls: Array<string | null>) {
  const uniquePaths = Array.from(
    new Set(fileUrls.map((item) => (item ? resolveEvidencePath(item) : null)).filter(Boolean)),
  ) as string[];

  const results = await Promise.allSettled(
    uniquePaths.map((filePath) => unlink(filePath)),
  );

  return results.filter(
    (result) =>
      result.status === "rejected" &&
      (result.reason as NodeJS.ErrnoException)?.code !== "ENOENT",
  ).length;
}
