-- Additive internal assignment storage. Existing activity assignments and reports are untouched.
CREATE TABLE `InternalAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `assigneeId` VARCHAR(191) NOT NULL,
  `originServiceId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `dueDate` DATETIME(3) NULL,
  `status` ENUM('PENDING', 'OPENED', 'SUBMITTED', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
  `openedAt` DATETIME(3) NULL,
  `submittedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `canceledAt` DATETIME(3) NULL,
  `reportType` ENUM('GUIDANCE_REPORT', 'REPORT_SNAPSHOT') NULL,
  `guidanceReportId` VARCHAR(191) NULL,
  `reportSnapshotId` VARCHAR(191) NULL,
  `sourceServiceId` VARCHAR(191) NULL,
  `reportTitleSnapshot` VARCHAR(191) NULL,
  `sourceServiceSlugSnapshot` VARCHAR(191) NULL,
  `sourceServiceNameSnapshot` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `InternalAssignment_school_origin_idx` (`schoolAccountId`, `originServiceId`),
  INDEX `InternalAssignment_creator_status_idx` (`createdById`, `status`),
  INDEX `InternalAssignment_assignee_status_idx` (`assigneeId`, `status`),
  INDEX `InternalAssignment_guidance_report_idx` (`guidanceReportId`),
  INDEX `InternalAssignment_report_snapshot_idx` (`reportSnapshotId`),
  INDEX `InternalAssignment_source_service_idx` (`sourceServiceId`),
  INDEX `InternalAssignment_submitted_at_idx` (`submittedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InternalAssignment`
  ADD CONSTRAINT `InternalAssignment_school_fk`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InternalAssignment`
  ADD CONSTRAINT `InternalAssignment_creator_fk`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InternalAssignment`
  ADD CONSTRAINT `InternalAssignment_assignee_fk`
  FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InternalAssignment`
  ADD CONSTRAINT `InternalAssignment_origin_service_fk`
  FOREIGN KEY (`originServiceId`) REFERENCES `Service`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `InternalAssignment`
  ADD CONSTRAINT `InternalAssignment_guidance_report_fk`
  FOREIGN KEY (`guidanceReportId`) REFERENCES `GuidanceReport`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InternalAssignment`
  ADD CONSTRAINT `InternalAssignment_report_snapshot_fk`
  FOREIGN KEY (`reportSnapshotId`) REFERENCES `ReportSnapshot`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InternalAssignment`
  ADD CONSTRAINT `InternalAssignment_source_service_fk`
  FOREIGN KEY (`sourceServiceId`) REFERENCES `Service`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
