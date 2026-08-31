CREATE TABLE `ActivityPlanTenPercentEntry` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NOT NULL,
    `domains` JSON NOT NULL,
    `programs` JSON NOT NULL,
    `periodCount` VARCHAR(191) NULL,
    `executionWeeks` JSON NOT NULL,
    `subject` VARCHAR(191) NULL,
    `grades` JSON NOT NULL,
    `teacherNames` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ActivityPlanTenPercentEntry_schoolAccountId_stage_idx`(`schoolAccountId`, `stage`),
    INDEX `ActivityPlanTenPercentEntry_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ActivityPlanTenPercentEntry`
    ADD CONSTRAINT `ActivityPlanTenPercentEntry_schoolAccountId_fkey`
    FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ActivityPlanTenPercentEntry`
    ADD CONSTRAINT `ActivityPlanTenPercentEntry_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
