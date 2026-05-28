-- CreateTable
CREATE TABLE "SchoolAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'COUNSELOR',
    "gender" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "principalName" TEXT,
    "city" TEXT,
    "district" TEXT,
    "academicYear" TEXT,
    "currentSemester" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolProfile_schoolAccountId_fkey" FOREIGN KEY ("schoolAccountId") REFERENCES "SchoolAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guardian" (
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
CREATE TABLE "Student" (
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
CREATE TABLE "StaffMember" (
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
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workflow_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
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
CREATE TABLE "DynamicField" (
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
CREATE TABLE "DynamicFieldOption" (
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
CREATE TABLE "CaseEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "workflowId" TEXT,
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
CREATE TABLE "CaseValue" (
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
CREATE TABLE "Evidence" (
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
CREATE TABLE "ExportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceSlug" TEXT,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Plan" (
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
CREATE TABLE "PlanFeature" (
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
CREATE TABLE "Subscription" (
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
CREATE TABLE "ServiceAccess" (
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
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UsageLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planSlug" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
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
CREATE TABLE "BankTransferRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "senderName" TEXT,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ManualActivation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolAccountId" TEXT NOT NULL,
    "activatedById" TEXT,
    "reason" TEXT,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IntegrationProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApiCredential" (
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
CREATE TABLE "WebhookEvent" (
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
CREATE TABLE "ExternalSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalSyncLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "IntegrationProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAccount_slug_key" ON "SchoolAccount"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_schoolAccountId_idx" ON "User"("schoolAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolProfile_schoolAccountId_key" ON "SchoolProfile"("schoolAccountId");

-- CreateIndex
CREATE INDEX "Guardian_schoolAccountId_idx" ON "Guardian"("schoolAccountId");

-- CreateIndex
CREATE INDEX "Student_schoolAccountId_idx" ON "Student"("schoolAccountId");

-- CreateIndex
CREATE INDEX "Student_guardianId_idx" ON "Student"("guardianId");

-- CreateIndex
CREATE INDEX "Student_fullName_idx" ON "Student"("fullName");

-- CreateIndex
CREATE INDEX "StaffMember_schoolAccountId_idx" ON "StaffMember"("schoolAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Workflow_serviceId_idx" ON "Workflow"("serviceId");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowStep_order_idx" ON "WorkflowStep"("order");

-- CreateIndex
CREATE INDEX "DynamicField_stepId_idx" ON "DynamicField"("stepId");

-- CreateIndex
CREATE INDEX "DynamicField_key_idx" ON "DynamicField"("key");

-- CreateIndex
CREATE INDEX "DynamicField_order_idx" ON "DynamicField"("order");

-- CreateIndex
CREATE INDEX "DynamicFieldOption_fieldId_idx" ON "DynamicFieldOption"("fieldId");

-- CreateIndex
CREATE INDEX "DynamicFieldOption_value_idx" ON "DynamicFieldOption"("value");

-- CreateIndex
CREATE INDEX "CaseEntry_schoolAccountId_idx" ON "CaseEntry"("schoolAccountId");

-- CreateIndex
CREATE INDEX "CaseEntry_serviceId_idx" ON "CaseEntry"("serviceId");

-- CreateIndex
CREATE INDEX "CaseEntry_workflowId_idx" ON "CaseEntry"("workflowId");

-- CreateIndex
CREATE INDEX "CaseEntry_studentId_idx" ON "CaseEntry"("studentId");

-- CreateIndex
CREATE INDEX "CaseEntry_status_idx" ON "CaseEntry"("status");

-- CreateIndex
CREATE INDEX "CaseValue_caseEntryId_idx" ON "CaseValue"("caseEntryId");

-- CreateIndex
CREATE INDEX "CaseValue_fieldKey_idx" ON "CaseValue"("fieldKey");

-- CreateIndex
CREATE INDEX "Evidence_caseEntryId_idx" ON "Evidence"("caseEntryId");

-- CreateIndex
CREATE INDEX "ExportTemplate_serviceSlug_idx" ON "ExportTemplate"("serviceSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE INDEX "PlanFeature_planId_idx" ON "PlanFeature"("planId");

-- CreateIndex
CREATE INDEX "PlanFeature_key_idx" ON "PlanFeature"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_schoolAccountId_key" ON "Subscription"("schoolAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAccess_schoolAccountId_serviceId_key" ON "ServiceAccess"("schoolAccountId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLimit_planSlug_featureKey_key" ON "UsageLimit"("planSlug", "featureKey");

-- CreateIndex
CREATE INDEX "UsageRecord_schoolAccountId_idx" ON "UsageRecord"("schoolAccountId");

-- CreateIndex
CREATE INDEX "UsageRecord_featureKey_idx" ON "UsageRecord"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_slug_key" ON "PaymentProvider"("slug");

-- CreateIndex
CREATE INDEX "PaymentTransaction_subscriptionId_idx" ON "PaymentTransaction"("subscriptionId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_providerId_idx" ON "PaymentTransaction"("providerId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "BankTransferRequest_schoolAccountId_idx" ON "BankTransferRequest"("schoolAccountId");

-- CreateIndex
CREATE INDEX "BankTransferRequest_status_idx" ON "BankTransferRequest"("status");

-- CreateIndex
CREATE INDEX "ManualActivation_schoolAccountId_idx" ON "ManualActivation"("schoolAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationProvider_slug_key" ON "IntegrationProvider"("slug");

-- CreateIndex
CREATE INDEX "ApiCredential_providerId_idx" ON "ApiCredential"("providerId");

-- CreateIndex
CREATE INDEX "WebhookEvent_providerId_idx" ON "WebhookEvent"("providerId");

-- CreateIndex
CREATE INDEX "WebhookEvent_processed_idx" ON "WebhookEvent"("processed");

-- CreateIndex
CREATE INDEX "ExternalSyncLog_providerId_idx" ON "ExternalSyncLog"("providerId");

-- CreateIndex
CREATE INDEX "ExternalSyncLog_entityType_idx" ON "ExternalSyncLog"("entityType");
