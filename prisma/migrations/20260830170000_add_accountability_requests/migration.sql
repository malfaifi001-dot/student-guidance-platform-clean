CREATE TABLE `AccountabilityRequest` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `caseEntryId` VARCHAR(191) NULL,
    `respondentUserId` VARCHAR(191) NULL,
    `respondentName` VARCHAR(191) NOT NULL,
    `respondentPhone` VARCHAR(191) NULL,
    `respondentEmail` VARCHAR(191) NULL,
    `respondentJobTitle` VARCHAR(191) NULL,
    `categoryKey` VARCHAR(191) NOT NULL,
    `typeKey` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `managerValues` JSON NOT NULL,
    `respondentValues` JSON NULL,
    `reviewValues` JSON NULL,
    `officialTextSnapshot` LONGTEXT NOT NULL,
    `deliveryMethod` ENUM('SYSTEM', 'WHATSAPP') NOT NULL DEFAULT 'SYSTEM',
    `token` VARCHAR(255) NOT NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `respondedAt` DATETIME(3) NULL,
    `returnedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `referredAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `returnedReason` TEXT NULL,
    `evidenceItems` JSON NULL,
    `status` ENUM('DRAFT', 'SENT', 'OPENED', 'RESPONDED', 'NEEDS_COMPLETION', 'CLOSED', 'REFERRED', 'EXPIRED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AccountabilityRequest_caseEntryId_key`(`caseEntryId`),
    UNIQUE INDEX `AccountabilityRequest_token_key`(`token`),
    INDEX `AccountabilityRequest_schoolAccountId_createdById_status_idx`(`schoolAccountId`, `createdById`, `status`),
    INDEX `AccountabilityRequest_respondentUserId_status_idx`(`respondentUserId`, `status`),
    INDEX `AccountabilityRequest_serviceId_workflowId_idx`(`serviceId`, `workflowId`),
    INDEX `AccountabilityRequest_tokenExpiresAt_status_idx`(`tokenExpiresAt`, `status`),
    INDEX `AccountabilityRequest_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AccountabilityRequest`
    ADD CONSTRAINT `AccountabilityRequest_schoolAccountId_fkey`
    FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccountabilityRequest`
    ADD CONSTRAINT `AccountabilityRequest_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AccountabilityRequest`
    ADD CONSTRAINT `AccountabilityRequest_serviceId_fkey`
    FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AccountabilityRequest`
    ADD CONSTRAINT `AccountabilityRequest_workflowId_fkey`
    FOREIGN KEY (`workflowId`) REFERENCES `Workflow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AccountabilityRequest`
    ADD CONSTRAINT `AccountabilityRequest_caseEntryId_fkey`
    FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AccountabilityRequest`
    ADD CONSTRAINT `AccountabilityRequest_respondentUserId_fkey`
    FOREIGN KEY (`respondentUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
