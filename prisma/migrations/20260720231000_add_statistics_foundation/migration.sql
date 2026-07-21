CREATE TABLE `StatisticalReport` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `serviceSlugSnapshot` VARCHAR(191) NOT NULL,
    `serviceNameSnapshot` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `dateFrom` DATETIME(3) NOT NULL,
    `dateTo` DATETIME(3) NOT NULL,
    `filtersJson` JSON NOT NULL,
    `deterministicMetricsJson` JSON NOT NULL,
    `aiAnalysisJson` JSON NULL,
    `sourceCaseCount` INTEGER NOT NULL DEFAULT 0,
    `sourceReportCount` INTEGER NOT NULL DEFAULT 0,
    `sourceReportIdsJson` JSON NOT NULL,
    `analysisMode` VARCHAR(40) NOT NULL DEFAULT 'DETERMINISTIC',
    `reportTemplateId` VARCHAR(191) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StatisticalReport_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `StatisticalReport_createdById_idx`(`createdById`),
    INDEX `StatisticalReport_serviceId_idx`(`serviceId`),
    INDEX `StatisticalReport_serviceSlugSnapshot_idx`(`serviceSlugSnapshot`),
    INDEX `StatisticalReport_dateFrom_dateTo_idx`(`dateFrom`, `dateTo`),
    INDEX `StatisticalReport_archivedAt_idx`(`archivedAt`),
    INDEX `StatisticalReport_createdAt_idx`(`createdAt`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE `GuidanceReport`
SET `status` = 'GENERATED'
WHERE `status` = 'DRAFT'
  AND `generatedAt` IS NOT NULL
  AND `templateSnapshot` IS NOT NULL
  AND `reportDataSnapshot` IS NOT NULL
  AND `renderedContent` IS NOT NULL
  AND TRIM(`renderedContent`) <> '';