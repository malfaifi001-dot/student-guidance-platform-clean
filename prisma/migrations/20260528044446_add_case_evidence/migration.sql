-- CreateTable
CREATE TABLE "CaseEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseEntryId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseEvidence_caseEntryId_fkey" FOREIGN KEY ("caseEntryId") REFERENCES "CaseEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CaseEvidence_caseEntryId_idx" ON "CaseEvidence"("caseEntryId");
