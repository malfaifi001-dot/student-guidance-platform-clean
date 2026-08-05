import "server-only";

import {
  deleteEvidenceFile,
  getEvidenceStoredFileNameFromUrl,
} from "@/lib/evidence/evidence-file-storage";

export async function deleteEvidenceFiles(fileUrls: Array<string | null>) {
  const uniqueFileNames = Array.from(new Set(
    fileUrls
      .map((fileUrl) => fileUrl ? getEvidenceStoredFileNameFromUrl(fileUrl) : null)
      .filter((fileName): fileName is string => Boolean(fileName)),
  ));

  const results = await Promise.all(uniqueFileNames.map((fileName) => deleteEvidenceFile(fileName)));
  return results.reduce((total, failures) => total + failures, 0);
}
