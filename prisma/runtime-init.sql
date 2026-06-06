-- CreateTable
CREATE TABLE IF NOT EXISTS "SchoolAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'COUNSELOR',
    "gender" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "officialName" TEXT,
    "jobTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" DATETIME,
    "onboardingSkippedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SchoolProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "principalName" TEXT,
    "educationDepartment" TEXT,
    "educationOffice" TEXT,
    "city" TEXT,
    "district" TEXT,
    "stage" TEXT,
    "academicYear" TEXT,
    "currentSemester" TEXT,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolProfile_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Guardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "relation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guardian_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "guardianId" TEXT,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "stage" TEXT,
    "grade" TEXT,
    "classroom" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Student_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StaffMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffMember_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "workflowType" TEXT NOT NULL DEFAULT 'default',
    "studentPickerMode" TEXT NOT NULL DEFAULT 'SERVICE_DEFAULT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workflow_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkflowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DynamicField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "dependsOnFieldKey" TEXT,
    "linkedToValue" TEXT,
    "allowOther" BOOLEAN NOT NULL DEFAULT false,
    "isRepeater" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DynamicField_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DynamicFieldOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "linkedToValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DynamicFieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "DynamicField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CaseEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "workflowId" TEXT,
    "workflowSnapshot" JSONB,
    "studentId" TEXT,
    "createdById" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseEntry_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseEntry_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CaseValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseEntryId" TEXT NOT NULL,
    "fieldId" TEXT,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT,
    "jsonValue" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseValue_caseEntryId_fkey" FOREIGN KEY ("caseEntryId") REFERENCES "CaseEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "DynamicField" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseEntryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evidence_caseEntryId_fkey" FOREIGN KEY ("caseEntryId") REFERENCES "CaseEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CalendarReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "linkType" TEXT NOT NULL DEFAULT 'GENERAL',
    "scheduledAt" DATETIME NOT NULL,
    "remindBeforeMinutes" INTEGER,
    "serviceId" TEXT,
    "caseEntryId" TEXT,
    "studentId" TEXT,
    "completedAt" DATETIME,
    "completedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarReminder_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarReminder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarReminder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarReminder_caseEntryId_fkey" FOREIGN KEY ("caseEntryId") REFERENCES "CaseEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarReminder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceSlug" TEXT,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "priceMonthly" INTEGER NOT NULL DEFAULT 0,
    "priceYearly" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlanFeature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ServiceAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAccess_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAccess_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UsageLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planSlug" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT,
    "providerId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "externalRef" TEXT,
    "metadataJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentTransaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PaymentProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BankTransferRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "senderName" TEXT,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "planId" TEXT,
    "durationDays" INTEGER,
    "requesterUserId" TEXT,
    "billingCycle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ManualActivation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "activatedById" TEXT,
    "reason" TEXT,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegrationProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keyName" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApiCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IntegrationProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IntegrationProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExternalSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalSyncLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IntegrationProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ResultsAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT,
    "title" TEXT NOT NULL,
    "grade" TEXT,
    "classroom" TEXT,
    "sourceFile" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalSubjects" INTEGER NOT NULL DEFAULT 0,
    "averageScore" REAL,
    "summaryJson" JSONB,
    "rowsJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResultsAnalysis_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GuidanceReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "serviceSlug" TEXT NOT NULL,
    "caseEntryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "genderMode" TEXT NOT NULL DEFAULT 'MALE',
    "editableContent" TEXT NOT NULL,
    "renderedContent" TEXT,
    "evidenceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "templateId" TEXT,
    "templateSnapshot" JSONB,
    "reportDataSnapshot" JSONB,
    "generatedAt" DATETIME,
    "generatedPdfUrl" TEXT,
    "approvedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuidanceReport_caseEntryId_fkey" FOREIGN KEY ("caseEntryId") REFERENCES "CaseEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReportEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "caption" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "GuidanceReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceSlug" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "content" TEXT NOT NULL,
    "templateJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "genderAware" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "caseEntryId" TEXT,
    CONSTRAINT "ReportTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReportTemplate_caseEntryId_fkey" FOREIGN KEY ("caseEntryId") REFERENCES "CaseEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StudentImportSession" (
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
    "academicYear" TEXT,
    "term" TEXT,
    "importMode" TEXT NOT NULL DEFAULT 'FULL_SYNC',
    "committedByUserId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "archivedByUserId" TEXT,
    "cycleId" TEXT,
    CONSTRAINT "StudentImportSession_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StudentImportFile" (
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
CREATE TABLE IF NOT EXISTS "StudentImportRow" (
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
    "planAction" TEXT,
    CONSTRAINT "StudentImportRow_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudentImportSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CaseEvidence" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "ActivationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schoolAccountId" TEXT,
    "createdById" TEXT,
    "usedByUserId" TEXT,
    "startsAt" DATETIME,
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlatformActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "schoolAccountId" TEXT,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StudentImportChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "rowId" TEXT,
    "studentId" TEXT,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "rolledBackAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NoorImportCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "pendingSessions" INTEGER NOT NULL DEFAULT 0,
    "committedSessions" INTEGER NOT NULL DEFAULT 0,
    "latestSessionId" TEXT,
    "latestCommittedAt" DATETIME,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "archivedByUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolAccount_slug_key" ON "SchoolAccount"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_schoolAccountId_idx" ON "User"("schoolAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenId_key" ON "UserSession"("tokenId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_tokenId_idx" ON "UserSession"("tokenId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_isActive_idx" ON "UserSession"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolProfile_schoolAccountId_key" ON "SchoolProfile"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Guardian_schoolAccountId_idx" ON "Guardian"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Student_schoolAccountId_idx" ON "Student"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Student_guardianId_idx" ON "Student"("guardianId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Student_fullName_idx" ON "Student"("fullName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffMember_schoolAccountId_idx" ON "StaffMember"("schoolAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Workflow_serviceId_idx" ON "Workflow"("serviceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Workflow_serviceId_workflowType_isActive_idx" ON "Workflow"("serviceId", "workflowType", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkflowStep_order_idx" ON "WorkflowStep"("order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DynamicField_stepId_idx" ON "DynamicField"("stepId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DynamicField_key_idx" ON "DynamicField"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DynamicField_order_idx" ON "DynamicField"("order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DynamicFieldOption_fieldId_idx" ON "DynamicFieldOption"("fieldId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DynamicFieldOption_value_idx" ON "DynamicFieldOption"("value");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseEntry_schoolAccountId_idx" ON "CaseEntry"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseEntry_serviceId_idx" ON "CaseEntry"("serviceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseEntry_workflowId_idx" ON "CaseEntry"("workflowId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseEntry_studentId_idx" ON "CaseEntry"("studentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseEntry_status_idx" ON "CaseEntry"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseValue_caseEntryId_idx" ON "CaseValue"("caseEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseValue_fieldKey_idx" ON "CaseValue"("fieldKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Evidence_caseEntryId_idx" ON "Evidence"("caseEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarReminder_schoolAccountId_idx" ON "CalendarReminder"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarReminder_createdById_idx" ON "CalendarReminder"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarReminder_status_idx" ON "CalendarReminder"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarReminder_priority_idx" ON "CalendarReminder"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarReminder_scheduledAt_idx" ON "CalendarReminder"("scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarReminder_serviceId_idx" ON "CalendarReminder"("serviceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarReminder_caseEntryId_idx" ON "CalendarReminder"("caseEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarReminder_studentId_idx" ON "CalendarReminder"("studentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExportTemplate_serviceSlug_idx" ON "ExportTemplate"("serviceSlug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlanFeature_planId_idx" ON "PlanFeature"("planId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlanFeature_key_idx" ON "PlanFeature"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_schoolAccountId_key" ON "Subscription"("schoolAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceAccess_schoolAccountId_serviceId_key" ON "ServiceAccess"("schoolAccountId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UsageLimit_planSlug_featureKey_key" ON "UsageLimit"("planSlug", "featureKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UsageRecord_schoolAccountId_idx" ON "UsageRecord"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UsageRecord_featureKey_idx" ON "UsageRecord"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentProvider_slug_key" ON "PaymentProvider"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentTransaction_subscriptionId_idx" ON "PaymentTransaction"("subscriptionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentTransaction_providerId_idx" ON "PaymentTransaction"("providerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BankTransferRequest_schoolAccountId_idx" ON "BankTransferRequest"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BankTransferRequest_status_idx" ON "BankTransferRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManualActivation_schoolAccountId_idx" ON "ManualActivation"("schoolAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationProvider_slug_key" ON "IntegrationProvider"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiCredential_providerId_idx" ON "ApiCredential"("providerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_providerId_idx" ON "WebhookEvent"("providerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_processed_idx" ON "WebhookEvent"("processed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExternalSyncLog_providerId_idx" ON "ExternalSyncLog"("providerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExternalSyncLog_entityType_idx" ON "ExternalSyncLog"("entityType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ResultsAnalysis_schoolAccountId_idx" ON "ResultsAnalysis"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ResultsAnalysis_grade_idx" ON "ResultsAnalysis"("grade");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ResultsAnalysis_classroom_idx" ON "ResultsAnalysis"("classroom");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuidanceReport_caseEntryId_idx" ON "GuidanceReport"("caseEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuidanceReport_serviceSlug_idx" ON "GuidanceReport"("serviceSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuidanceReport_status_idx" ON "GuidanceReport"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuidanceReport_templateId_idx" ON "GuidanceReport"("templateId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuidanceReport_generatedAt_idx" ON "GuidanceReport"("generatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportEvidence_reportId_idx" ON "ReportEvidence"("reportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportEvidence_visible_idx" ON "ReportEvidence"("visible");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportTemplate_serviceSlug_idx" ON "ReportTemplate"("serviceSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportTemplate_type_idx" ON "ReportTemplate"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportTemplate_isActive_idx" ON "ReportTemplate"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportTemplate_createdById_idx" ON "ReportTemplate"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportSession_schoolAccountId_idx" ON "StudentImportSession"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportSession_status_idx" ON "StudentImportSession"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportFile_sessionId_idx" ON "StudentImportFile"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportRow_sessionId_idx" ON "StudentImportRow"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportRow_nationalId_idx" ON "StudentImportRow"("nationalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportRow_status_idx" ON "StudentImportRow"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CaseEvidence_caseEntryId_idx" ON "CaseEvidence"("caseEntryId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ActivationCode_code_key" ON "ActivationCode"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivationCode_code_idx" ON "ActivationCode"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivationCode_isActive_idx" ON "ActivationCode"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivationCode_schoolAccountId_idx" ON "ActivationCode"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivationCode_createdById_idx" ON "ActivationCode"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivationCode_usedByUserId_idx" ON "ActivationCode"("usedByUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlatformActivityLog_actorUserId_idx" ON "PlatformActivityLog"("actorUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlatformActivityLog_targetUserId_idx" ON "PlatformActivityLog"("targetUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlatformActivityLog_schoolAccountId_idx" ON "PlatformActivityLog"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlatformActivityLog_category_idx" ON "PlatformActivityLog"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlatformActivityLog_action_idx" ON "PlatformActivityLog"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlatformActivityLog_createdAt_idx" ON "PlatformActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportChange_sessionId_idx" ON "StudentImportChange"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportChange_studentId_idx" ON "StudentImportChange"("studentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentImportChange_action_idx" ON "StudentImportChange"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NoorImportCycle_schoolAccountId_idx" ON "NoorImportCycle"("schoolAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NoorImportCycle_schoolAccountId_academicYear_term_idx" ON "NoorImportCycle"("schoolAccountId", "academicYear", "term");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NoorImportCycle_status_idx" ON "NoorImportCycle"("status");

