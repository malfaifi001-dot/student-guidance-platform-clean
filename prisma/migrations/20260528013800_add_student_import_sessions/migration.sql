-- CreateTable
CREATE TABLE "StudentImportSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'NOOR_EXCEL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "committedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentImportSession_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentImportFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentImportFile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudentImportSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentImportRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "stage" TEXT,
    "grade" TEXT,
    "classroom" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "matchedStudentId" TEXT,
    "errorMessage" TEXT,
    "rawJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentImportRow_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudentImportSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StudentImportSession_schoolAccountId_idx" ON "StudentImportSession"("schoolAccountId");

-- CreateIndex
CREATE INDEX "StudentImportSession_status_idx" ON "StudentImportSession"("status");

-- CreateIndex
CREATE INDEX "StudentImportFile_sessionId_idx" ON "StudentImportFile"("sessionId");

-- CreateIndex
CREATE INDEX "StudentImportRow_sessionId_idx" ON "StudentImportRow"("sessionId");

-- CreateIndex
CREATE INDEX "StudentImportRow_nationalId_idx" ON "StudentImportRow"("nationalId");

-- CreateIndex
CREATE INDEX "StudentImportRow_status_idx" ON "StudentImportRow"("status");
