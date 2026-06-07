-- CreateTable
CREATE TABLE `SchoolAccount` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SchoolAccount_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'COUNSELOR', 'SCHOOL_OWNER', 'STAFF') NOT NULL DEFAULT 'COUNSELOR',
    `gender` ENUM('MALE', 'FEMALE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `officialName` VARCHAR(191) NULL,
    `jobTitle` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `onboardingCompleted` BOOLEAN NOT NULL DEFAULT false,
    `onboardingCompletedAt` DATETIME(3) NULL,
    `onboardingSkippedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_schoolAccountId_idx`(`schoolAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenId` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserSession_tokenId_key`(`tokenId`),
    INDEX `UserSession_userId_idx`(`userId`),
    INDEX `UserSession_tokenId_idx`(`tokenId`),
    INDEX `UserSession_isActive_idx`(`isActive`),
    INDEX `UserSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SchoolProfile` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `schoolName` VARCHAR(191) NOT NULL,
    `principalName` VARCHAR(191) NULL,
    `educationDepartment` VARCHAR(191) NULL,
    `educationOffice` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `stage` VARCHAR(191) NULL,
    `academicYear` VARCHAR(191) NULL,
    `currentSemester` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SchoolProfile_schoolAccountId_key`(`schoolAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guardian` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `relation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Guardian_schoolAccountId_idx`(`schoolAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `guardianId` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `nationalId` VARCHAR(191) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `stage` VARCHAR(191) NULL,
    `grade` VARCHAR(191) NULL,
    `classroom` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Student_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `Student_guardianId_idx`(`guardianId`),
    INDEX `Student_fullName_idx`(`fullName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffMember` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `roleTitle` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffMember_schoolAccountId_idx`(`schoolAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'COMING_SOON') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Service_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Workflow` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `workflowType` VARCHAR(191) NOT NULL DEFAULT 'default',
    `studentPickerMode` ENUM('SERVICE_DEFAULT', 'REQUIRED', 'DISABLED') NOT NULL DEFAULT 'SERVICE_DEFAULT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Workflow_serviceId_idx`(`serviceId`),
    INDEX `Workflow_serviceId_workflowType_isActive_idx`(`serviceId`, `workflowType`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkflowStep` (
    `id` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WorkflowStep_workflowId_idx`(`workflowId`),
    INDEX `WorkflowStep_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DynamicField` (
    `id` VARCHAR(191) NOT NULL,
    `stepId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'RADIO', 'FILE_UPLOAD', 'IMAGE_UPLOAD', 'STUDENT_PICKER', 'PARENT_PICKER', 'STAFF_PICKER', 'REPEATER', 'SIGNATURE', 'RICH_TEXT') NOT NULL,
    `placeholder` VARCHAR(191) NULL,
    `helpText` VARCHAR(191) NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL,
    `dependsOnFieldKey` VARCHAR(191) NULL,
    `linkedToValue` VARCHAR(191) NULL,
    `allowOther` BOOLEAN NOT NULL DEFAULT false,
    `isRepeater` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DynamicField_stepId_idx`(`stepId`),
    INDEX `DynamicField_key_idx`(`key`),
    INDEX `DynamicField_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DynamicFieldOption` (
    `id` VARCHAR(191) NOT NULL,
    `fieldId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `linkedToValue` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DynamicFieldOption_fieldId_idx`(`fieldId`),
    INDEX `DynamicFieldOption_value_idx`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CaseEntry` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NULL,
    `workflowSnapshot` JSON NULL,
    `studentId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CaseEntry_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `CaseEntry_serviceId_idx`(`serviceId`),
    INDEX `CaseEntry_workflowId_idx`(`workflowId`),
    INDEX `CaseEntry_studentId_idx`(`studentId`),
    INDEX `CaseEntry_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CaseValue` (
    `id` VARCHAR(191) NOT NULL,
    `caseEntryId` VARCHAR(191) NOT NULL,
    `fieldId` VARCHAR(191) NULL,
    `fieldKey` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NULL,
    `jsonValue` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CaseValue_caseEntryId_idx`(`caseEntryId`),
    INDEX `CaseValue_fieldKey_idx`(`fieldKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evidence` (
    `id` VARCHAR(191) NOT NULL,
    `caseEntryId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'FILE', 'LINK') NOT NULL,
    `fileName` VARCHAR(191) NULL,
    `fileUrl` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Evidence_caseEntryId_idx`(`caseEntryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarReminder` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `priority` ENUM('NORMAL', 'IMPORTANT', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `linkType` ENUM('GENERAL', 'SERVICE', 'CASE', 'STUDENT') NOT NULL DEFAULT 'GENERAL',
    `scheduledAt` DATETIME(3) NOT NULL,
    `remindBeforeMinutes` INTEGER NULL,
    `serviceId` VARCHAR(191) NULL,
    `caseEntryId` VARCHAR(191) NULL,
    `studentId` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `completedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CalendarReminder_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `CalendarReminder_createdById_idx`(`createdById`),
    INDEX `CalendarReminder_status_idx`(`status`),
    INDEX `CalendarReminder_priority_idx`(`priority`),
    INDEX `CalendarReminder_scheduledAt_idx`(`scheduledAt`),
    INDEX `CalendarReminder_serviceId_idx`(`serviceId`),
    INDEX `CalendarReminder_caseEntryId_idx`(`caseEntryId`),
    INDEX `CalendarReminder_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `serviceSlug` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExportTemplate_serviceSlug_idx`(`serviceSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `priceMonthly` INTEGER NOT NULL DEFAULT 0,
    `priceYearly` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Plan_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanFeature` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanFeature_planId_idx`(`planId`),
    INDEX `PlanFeature_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'TRIAL',
    `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_schoolAccountId_key`(`schoolAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceAccess` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceAccess_schoolAccountId_serviceId_key`(`schoolAccountId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeatureFlag` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeatureFlag_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsageLimit` (
    `id` VARCHAR(191) NOT NULL,
    `planSlug` VARCHAR(191) NOT NULL,
    `featureKey` VARCHAR(191) NOT NULL,
    `limit` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UsageLimit_planSlug_featureKey_key`(`planSlug`, `featureKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsageRecord` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `featureKey` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UsageRecord_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `UsageRecord_featureKey_idx`(`featureKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentProvider` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `configJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentProvider_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `providerId` VARCHAR(191) NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'SAR',
    `method` ENUM('CARD', 'BANK_TRANSFER', 'MANUAL') NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `externalRef` VARCHAR(191) NULL,
    `metadataJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PaymentTransaction_subscriptionId_idx`(`subscriptionId`),
    INDEX `PaymentTransaction_providerId_idx`(`providerId`),
    INDEX `PaymentTransaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankTransferRequest` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'SAR',
    `senderName` VARCHAR(191) NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `adminNote` VARCHAR(191) NULL,
    `planId` VARCHAR(191) NULL,
    `durationDays` INTEGER NULL,
    `requesterUserId` VARCHAR(191) NULL,
    `billingCycle` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BankTransferRequest_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `BankTransferRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManualActivation` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `activatedById` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ManualActivation_schoolAccountId_idx`(`schoolAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IntegrationProvider` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ERROR') NOT NULL DEFAULT 'INACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IntegrationProvider_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiCredential` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `keyName` VARCHAR(191) NOT NULL,
    `encryptedValue` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ApiCredential_providerId_idx`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payloadJson` JSON NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookEvent_providerId_idx`(`providerId`),
    INDEX `WebhookEvent_processed_idx`(`processed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalSyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExternalSyncLog_providerId_idx`(`providerId`),
    INDEX `ExternalSyncLog_entityType_idx`(`entityType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResultsAnalysis` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NULL,
    `classroom` VARCHAR(191) NULL,
    `sourceFile` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `totalStudents` INTEGER NOT NULL DEFAULT 0,
    `totalSubjects` INTEGER NOT NULL DEFAULT 0,
    `averageScore` DOUBLE NULL,
    `summaryJson` JSON NULL,
    `rowsJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ResultsAnalysis_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `ResultsAnalysis_grade_idx`(`grade`),
    INDEX `ResultsAnalysis_classroom_idx`(`classroom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuidanceReport` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `serviceSlug` VARCHAR(191) NOT NULL,
    `caseEntryId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'GENERATED', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `genderMode` VARCHAR(191) NOT NULL DEFAULT 'MALE',
    `editableContent` VARCHAR(191) NOT NULL,
    `renderedContent` VARCHAR(191) NULL,
    `evidenceEnabled` BOOLEAN NOT NULL DEFAULT true,
    `templateId` VARCHAR(191) NULL,
    `templateSnapshot` JSON NULL,
    `reportDataSnapshot` JSON NULL,
    `generatedAt` DATETIME(3) NULL,
    `generatedPdfUrl` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuidanceReport_caseEntryId_idx`(`caseEntryId`),
    INDEX `GuidanceReport_serviceSlug_idx`(`serviceSlug`),
    INDEX `GuidanceReport_status_idx`(`status`),
    INDEX `GuidanceReport_templateId_idx`(`templateId`),
    INDEX `GuidanceReport_generatedAt_idx`(`generatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReportEvidence_reportId_idx`(`reportId`),
    INDEX `ReportEvidence_visible_idx`(`visible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `serviceSlug` VARCHAR(191) NULL,
    `type` ENUM('SYSTEM', 'SCHOOL', 'PERSONAL') NOT NULL DEFAULT 'SYSTEM',
    `content` VARCHAR(191) NOT NULL,
    `templateJson` JSON NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `genderAware` BOOLEAN NOT NULL DEFAULT true,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `caseEntryId` VARCHAR(191) NULL,

    INDEX `ReportTemplate_serviceSlug_idx`(`serviceSlug`),
    INDEX `ReportTemplate_type_idx`(`type`),
    INDEX `ReportTemplate_isActive_idx`(`isActive`),
    INDEX `ReportTemplate_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentImportSession` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'NOOR_EXCEL',
    `status` ENUM('DRAFT', 'PARSED', 'COMMITTED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `totalRows` INTEGER NOT NULL DEFAULT 0,
    `validRows` INTEGER NOT NULL DEFAULT 0,
    `invalidRows` INTEGER NOT NULL DEFAULT 0,
    `createdCount` INTEGER NOT NULL DEFAULT 0,
    `updatedCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `conflictCount` INTEGER NOT NULL DEFAULT 0,
    `committedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `academicYear` VARCHAR(191) NULL,
    `term` VARCHAR(191) NULL,
    `importMode` VARCHAR(191) NOT NULL DEFAULT 'FULL_SYNC',
    `committedByUserId` VARCHAR(191) NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(3) NULL,
    `archivedByUserId` VARCHAR(191) NULL,
    `cycleId` VARCHAR(191) NULL,

    INDEX `StudentImportSession_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `StudentImportSession_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentImportFile` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `rowCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudentImportFile_sessionId_idx`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentImportRow` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `rowIndex` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'VALID', 'INVALID', 'CREATED', 'UPDATED', 'SKIPPED', 'CONFLICT') NOT NULL DEFAULT 'PENDING',
    `fullName` VARCHAR(191) NOT NULL,
    `nationalId` VARCHAR(191) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `stage` VARCHAR(191) NULL,
    `grade` VARCHAR(191) NULL,
    `classroom` VARCHAR(191) NULL,
    `guardianName` VARCHAR(191) NULL,
    `guardianPhone` VARCHAR(191) NULL,
    `matchedStudentId` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `rawJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `planAction` VARCHAR(191) NULL,

    INDEX `StudentImportRow_sessionId_idx`(`sessionId`),
    INDEX `StudentImportRow_nationalId_idx`(`nationalId`),
    INDEX `StudentImportRow_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CaseEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `caseEntryId` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CaseEvidence_caseEntryId_idx`(`caseEntryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivationCode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `durationDays` INTEGER NOT NULL DEFAULT 30,
    `maxUses` INTEGER NOT NULL DEFAULT 1,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `schoolAccountId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `usedByUserId` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ActivationCode_code_key`(`code`),
    INDEX `ActivationCode_code_idx`(`code`),
    INDEX `ActivationCode_isActive_idx`(`isActive`),
    INDEX `ActivationCode_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `ActivationCode_createdById_idx`(`createdById`),
    INDEX `ActivationCode_usedByUserId_idx`(`usedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `targetUserId` VARCHAR(191) NULL,
    `schoolAccountId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'INFO',
    `title` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlatformActivityLog_actorUserId_idx`(`actorUserId`),
    INDEX `PlatformActivityLog_targetUserId_idx`(`targetUserId`),
    INDEX `PlatformActivityLog_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `PlatformActivityLog_category_idx`(`category`),
    INDEX `PlatformActivityLog_action_idx`(`action`),
    INDEX `PlatformActivityLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentImportChange` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `rowId` VARCHAR(191) NULL,
    `studentId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `beforeJson` JSON NULL,
    `afterJson` JSON NULL,
    `rolledBackAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudentImportChange_sessionId_idx`(`sessionId`),
    INDEX `StudentImportChange_studentId_idx`(`studentId`),
    INDEX `StudentImportChange_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoorImportCycle` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `academicYear` VARCHAR(191) NOT NULL,
    `term` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `totalStudents` INTEGER NOT NULL DEFAULT 0,
    `totalSessions` INTEGER NOT NULL DEFAULT 0,
    `pendingSessions` INTEGER NOT NULL DEFAULT 0,
    `committedSessions` INTEGER NOT NULL DEFAULT 0,
    `latestSessionId` VARCHAR(191) NULL,
    `latestCommittedAt` DATETIME(3) NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(3) NULL,
    `archivedByUserId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `NoorImportCycle_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `NoorImportCycle_schoolAccountId_academicYear_term_idx`(`schoolAccountId`, `academicYear`, `term`),
    INDEX `NoorImportCycle_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceSettings` (
    `id` VARCHAR(191) NOT NULL,
    `singletonKey` VARCHAR(191) NOT NULL DEFAULT 'default',
    `sellerName` VARCHAR(191) NOT NULL DEFAULT 'منصة التوجيه الطلابي',
    `sellerDomain` VARCHAR(191) NULL DEFAULT 'smstudents.com',
    `sellerCountry` VARCHAR(191) NULL DEFAULT 'المملكة العربية السعودية',
    `sellerAddress` VARCHAR(191) NULL,
    `commercialRegistration` VARCHAR(191) NULL,
    `taxNumber` VARCHAR(191) NULL,
    `vatEnabled` BOOLEAN NOT NULL DEFAULT false,
    `vatRate` INTEGER NOT NULL DEFAULT 0,
    `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'INV',
    `invoiceNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InvoiceSettings_singletonKey_key`(`singletonKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceNumberSequence` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `nextNumber` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InvoiceNumberSequence_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `paymentTransactionId` VARCHAR(191) NOT NULL,
    `issuedById` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ISSUED',
    `sellerName` VARCHAR(191) NOT NULL,
    `sellerDomain` VARCHAR(191) NULL,
    `sellerCountry` VARCHAR(191) NULL,
    `sellerAddress` VARCHAR(191) NULL,
    `commercialRegistration` VARCHAR(191) NULL,
    `taxNumber` VARCHAR(191) NULL,
    `buyerName` VARCHAR(191) NOT NULL,
    `buyerEmail` VARCHAR(191) NULL,
    `buyerJobTitle` VARCHAR(191) NULL,
    `buyerSchoolName` VARCHAR(191) NULL,
    `buyerAccountName` VARCHAR(191) NULL,
    `itemTitle` VARCHAR(191) NOT NULL,
    `subtotalAmount` INTEGER NOT NULL,
    `taxRate` INTEGER NOT NULL DEFAULT 0,
    `taxAmount` INTEGER NOT NULL DEFAULT 0,
    `totalAmount` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'SAR',
    `pdfUrl` VARCHAR(191) NULL,
    `snapshotJson` JSON NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_invoiceNumber_key`(`invoiceNumber`),
    UNIQUE INDEX `Invoice_paymentTransactionId_key`(`paymentTransactionId`),
    INDEX `Invoice_paymentTransactionId_idx`(`paymentTransactionId`),
    INDEX `Invoice_issuedAt_idx`(`issuedAt`),
    INDEX `Invoice_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditNote` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteNumber` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `issuedById` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ISSUED',
    `reason` TEXT NULL,
    `subtotalAmount` INTEGER NOT NULL,
    `taxRate` INTEGER NOT NULL DEFAULT 0,
    `taxAmount` INTEGER NOT NULL DEFAULT 0,
    `totalAmount` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'SAR',
    `snapshotJson` JSON NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CreditNote_creditNoteNumber_key`(`creditNoteNumber`),
    INDEX `CreditNote_invoiceId_idx`(`invoiceId`),
    INDEX `CreditNote_issuedAt_idx`(`issuedAt`),
    INDEX `CreditNote_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSession` ADD CONSTRAINT `UserSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchoolProfile` ADD CONSTRAINT `SchoolProfile_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guardian` ADD CONSTRAINT `Guardian_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_guardianId_fkey` FOREIGN KEY (`guardianId`) REFERENCES `Guardian`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffMember` ADD CONSTRAINT `StaffMember_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Workflow` ADD CONSTRAINT `Workflow_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkflowStep` ADD CONSTRAINT `WorkflowStep_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `Workflow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DynamicField` ADD CONSTRAINT `DynamicField_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `WorkflowStep`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DynamicFieldOption` ADD CONSTRAINT `DynamicFieldOption_fieldId_fkey` FOREIGN KEY (`fieldId`) REFERENCES `DynamicField`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseEntry` ADD CONSTRAINT `CaseEntry_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseEntry` ADD CONSTRAINT `CaseEntry_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseEntry` ADD CONSTRAINT `CaseEntry_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `Workflow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseEntry` ADD CONSTRAINT `CaseEntry_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseEntry` ADD CONSTRAINT `CaseEntry_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseValue` ADD CONSTRAINT `CaseValue_caseEntryId_fkey` FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseValue` ADD CONSTRAINT `CaseValue_fieldId_fkey` FOREIGN KEY (`fieldId`) REFERENCES `DynamicField`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evidence` ADD CONSTRAINT `Evidence_caseEntryId_fkey` FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminder` ADD CONSTRAINT `CalendarReminder_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminder` ADD CONSTRAINT `CalendarReminder_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminder` ADD CONSTRAINT `CalendarReminder_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminder` ADD CONSTRAINT `CalendarReminder_caseEntryId_fkey` FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminder` ADD CONSTRAINT `CalendarReminder_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanFeature` ADD CONSTRAINT `PlanFeature_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceAccess` ADD CONSTRAINT `ServiceAccess_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceAccess` ADD CONSTRAINT `ServiceAccess_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentTransaction` ADD CONSTRAINT `PaymentTransaction_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentTransaction` ADD CONSTRAINT `PaymentTransaction_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `PaymentProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiCredential` ADD CONSTRAINT `ApiCredential_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `IntegrationProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebhookEvent` ADD CONSTRAINT `WebhookEvent_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `IntegrationProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalSyncLog` ADD CONSTRAINT `ExternalSyncLog_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `IntegrationProvider`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResultsAnalysis` ADD CONSTRAINT `ResultsAnalysis_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuidanceReport` ADD CONSTRAINT `GuidanceReport_caseEntryId_fkey` FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportEvidence` ADD CONSTRAINT `ReportEvidence_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `GuidanceReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportTemplate` ADD CONSTRAINT `ReportTemplate_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportTemplate` ADD CONSTRAINT `ReportTemplate_caseEntryId_fkey` FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentImportSession` ADD CONSTRAINT `StudentImportSession_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentImportFile` ADD CONSTRAINT `StudentImportFile_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `StudentImportSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentImportRow` ADD CONSTRAINT `StudentImportRow_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `StudentImportSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseEvidence` ADD CONSTRAINT `CaseEvidence_caseEntryId_fkey` FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CaseEvidence` ADD CONSTRAINT `CaseEvidence_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_paymentTransactionId_fkey` FOREIGN KEY (`paymentTransactionId`) REFERENCES `PaymentTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
