import "server-only";

import { createHash } from "node:crypto";

export function hashPortfolioSnapshotDocument(document: unknown) {
  return createHash("sha256").update(JSON.stringify(document)).digest("hex");
}
