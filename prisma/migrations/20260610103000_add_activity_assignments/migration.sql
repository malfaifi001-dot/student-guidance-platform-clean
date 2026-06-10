CREATE TABLE `ActivityAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NULL,
  `serviceId` VARCHAR(191) NOT NULL,
  `workflowId` VARCHAR(191) NOT NULL,
  `caseEntryId` VARCHAR(191) NULL,
  `domainSlug` VARCHAR(191) NOT NULL,
  `domainTitle` VARCHAR(191) NOT NULL,
  `teacherName` VARCHAR(191) NOT NULL,
  `teacherPhone` VARCHAR(32) NOT NULL,
  `teacherEmail` VARCHAR(191) NULL,
  `dueDate` DATETIME(3) NULL,
  `note` TEXT NULL,
  `token` VARCHAR(191) NOT NULL,
  `tokenExpiresAt` DATETIME(3) NULL,
  `openedAt` DATETIME(3) NULL,
  `submittedAt` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `returnedAt` DATETIME(3) NULL,
  `canceledAt` DATETIME(3) NULL,
  `status` ENUM('SENT', 'OPENED', 'SUBMITTED', 'APPROVED', 'RETURNED', 'EXPIRED', 'CANCELED') NOT NULL DEFAULT 'SENT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ActivityAssignment_token_key`(`token`),
  UNIQUE INDEX `ActivityAssignment_caseEntryId_key`(`caseEntryId`),
  INDEX `ActivityAssignment_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `ActivityAssignment_createdById_idx`(`createdById`),
  INDEX `ActivityAssignment_serviceId_idx`(`serviceId`),
  INDEX `ActivityAssignment_workflowId_idx`(`workflowId`),
  INDEX `ActivityAssignment_domainSlug_idx`(`domainSlug`),
  INDEX `ActivityAssignment_teacherPhone_idx`(`teacherPhone`),
  INDEX `ActivityAssignment_status_idx`(`status`),
  INDEX `ActivityAssignment_dueDate_idx`(`dueDate`),
  INDEX `ActivityAssignment_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ActivityAssignment`
  ADD CONSTRAINT `ActivityAssignment_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ActivityAssignment`
  ADD CONSTRAINT `ActivityAssignment_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ActivityAssignment`
  ADD CONSTRAINT `ActivityAssignment_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ActivityAssignment`
  ADD CONSTRAINT `ActivityAssignment_workflowId_fkey`
  FOREIGN KEY (`workflowId`) REFERENCES `Workflow`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ActivityAssignment`
  ADD CONSTRAINT `ActivityAssignment_caseEntryId_fkey`
  FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;