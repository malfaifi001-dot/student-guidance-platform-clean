CREATE TABLE `ReportSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `caseEntryId` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NULL,
  `serviceSlug` VARCHAR(191) NULL,
  `serviceName` VARCHAR(191) NULL,
  `reportTitle` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NULL,
  `templateName` VARCHAR(191) NULL,
  `variantId` VARCHAR(191) NULL,
  `snapshotPayload` JSON NOT NULL,
  `snapshotTemplateJson` JSON NULL,
  `snapshotPagesJson` JSON NULL,
  `snapshotHtml` LONGTEXT NOT NULL,
  `pdfUrl` VARCHAR(191) NULL,
  `approvedById` VARCHAR(191) NULL,
  `approvedByName` VARCHAR(191) NULL,
  `approvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ReportSnapshot_caseEntryId_idx` ON `ReportSnapshot`(`caseEntryId`);
CREATE INDEX `ReportSnapshot_schoolAccountId_idx` ON `ReportSnapshot`(`schoolAccountId`);
CREATE INDEX `ReportSnapshot_serviceSlug_idx` ON `ReportSnapshot`(`serviceSlug`);
CREATE INDEX `ReportSnapshot_approvedAt_idx` ON `ReportSnapshot`(`approvedAt`);
CREATE INDEX `ReportSnapshot_approvedById_idx` ON `ReportSnapshot`(`approvedById`);
