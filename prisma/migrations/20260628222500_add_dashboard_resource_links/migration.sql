CREATE TABLE `DashboardResourceLink` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `sourceType` VARCHAR(60) NOT NULL,
  `sourceId` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(60) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdById` VARCHAR(191) NULL,
  `metadataJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `DashboardResourceLink_scope_target_key`
ON `DashboardResourceLink`(`schoolAccountId`, `sourceType`, `sourceId`, `targetType`, `targetId`);

CREATE INDEX `DashboardResourceLink_source_idx`
ON `DashboardResourceLink`(`schoolAccountId`, `sourceType`, `sourceId`);

CREATE INDEX `DashboardResourceLink_target_idx`
ON `DashboardResourceLink`(`schoolAccountId`, `targetType`, `targetId`);

CREATE INDEX `DashboardResourceLink_createdBy_idx`
ON `DashboardResourceLink`(`createdById`);