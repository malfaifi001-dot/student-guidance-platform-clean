-- CreateTable
CREATE TABLE `TeacherActivityLink` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `note` TEXT NULL,
  `status` ENUM('ACTIVE', 'CLOSED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `token` VARCHAR(191) NOT NULL,
  `tokenExpiresAt` DATETIME(3) NULL,
  `closedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `TeacherActivityLink_token_key`(`token`),
  INDEX `TeacherActivityLink_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `TeacherActivityLink_createdById_idx`(`createdById`),
  INDEX `TeacherActivityLink_status_idx`(`status`),
  INDEX `TeacherActivityLink_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeacherActivitySubmission` (
  `id` VARCHAR(191) NOT NULL,
  `linkId` VARCHAR(191) NOT NULL,
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
  `teacherSignatureUrl` VARCHAR(191) NULL,
  `teacherSignedName` VARCHAR(191) NULL,
  `teacherSignedAt` DATETIME(3) NULL,
  `submittedValues` JSON NULL,
  `submittedEvidenceItems` JSON NULL,
  `returnedReason` TEXT NULL,
  `submittedAt` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `returnedAt` DATETIME(3) NULL,
  `status` ENUM('SUBMITTED', 'RETURNED', 'APPROVED', 'CANCELED') NOT NULL DEFAULT 'SUBMITTED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `TeacherActivitySubmission_caseEntryId_key`(`caseEntryId`),
  INDEX `TeacherActivitySubmission_linkId_idx`(`linkId`),
  INDEX `TeacherActivitySubmission_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `TeacherActivitySubmission_serviceId_idx`(`serviceId`),
  INDEX `TeacherActivitySubmission_workflowId_idx`(`workflowId`),
  INDEX `TeacherActivitySubmission_domainSlug_idx`(`domainSlug`),
  INDEX `TeacherActivitySubmission_status_idx`(`status`),
  INDEX `TeacherActivitySubmission_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeacherActivityLink`
  ADD CONSTRAINT `TeacherActivityLink_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherActivityLink`
  ADD CONSTRAINT `TeacherActivityLink_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherActivitySubmission`
  ADD CONSTRAINT `TeacherActivitySubmission_linkId_fkey`
  FOREIGN KEY (`linkId`) REFERENCES `TeacherActivityLink`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherActivitySubmission`
  ADD CONSTRAINT `TeacherActivitySubmission_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherActivitySubmission`
  ADD CONSTRAINT `TeacherActivitySubmission_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherActivitySubmission`
  ADD CONSTRAINT `TeacherActivitySubmission_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherActivitySubmission`
  ADD CONSTRAINT `TeacherActivitySubmission_workflowId_fkey`
  FOREIGN KEY (`workflowId`) REFERENCES `Workflow`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherActivitySubmission`
  ADD CONSTRAINT `TeacherActivitySubmission_caseEntryId_fkey`
  FOREIGN KEY (`caseEntryId`) REFERENCES `CaseEntry`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
