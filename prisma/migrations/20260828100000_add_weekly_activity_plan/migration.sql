CREATE TABLE `WeeklyActivityPlanEntry` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NOT NULL,
    `weekNumber` INTEGER NOT NULL,
    `dateFrom` DATETIME(3) NOT NULL,
    `dateTo` DATETIME(3) NOT NULL,
    `periodCount` INTEGER NULL,
    `items` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WeeklyActivityPlanEntry_schoolAccountId_stage_weekNumber_key`(`schoolAccountId`, `stage`, `weekNumber`),
    INDEX `WeeklyActivityPlanEntry_schoolAccountId_stage_idx`(`schoolAccountId`, `stage`),
    INDEX `WeeklyActivityPlanEntry_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WeeklyActivityPlanEntry`
    ADD CONSTRAINT `WeeklyActivityPlanEntry_schoolAccountId_fkey`
    FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WeeklyActivityPlanEntry`
    ADD CONSTRAINT `WeeklyActivityPlanEntry_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
