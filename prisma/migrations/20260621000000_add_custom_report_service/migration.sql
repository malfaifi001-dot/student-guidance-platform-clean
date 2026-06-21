CREATE TABLE `CustomReportTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `prompt` TEXT NULL,
  `schemaJson` JSON NOT NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'AI',
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `isArchived` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CustomReportEntry` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `valuesJson` JSON NOT NULL,
  `snapshotSchemaJson` JSON NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `CustomReportTemplate_schoolAccountId_idx` ON `CustomReportTemplate`(`schoolAccountId`);
CREATE INDEX `CustomReportTemplate_createdById_idx` ON `CustomReportTemplate`(`createdById`);
CREATE INDEX `CustomReportTemplate_isArchived_idx` ON `CustomReportTemplate`(`isArchived`);
CREATE INDEX `CustomReportTemplate_status_idx` ON `CustomReportTemplate`(`status`);

CREATE INDEX `CustomReportEntry_schoolAccountId_idx` ON `CustomReportEntry`(`schoolAccountId`);
CREATE INDEX `CustomReportEntry_createdById_idx` ON `CustomReportEntry`(`createdById`);
CREATE INDEX `CustomReportEntry_templateId_idx` ON `CustomReportEntry`(`templateId`);
CREATE INDEX `CustomReportEntry_status_idx` ON `CustomReportEntry`(`status`);