CREATE TABLE `ActivityPlanEntry` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `programCaseEntryId` VARCHAR(191) NOT NULL,
    `weekNumber` INTEGER NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `periodNumber` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `gradeLabel` VARCHAR(191) NOT NULL,
    `teacherName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `ActivityPlanEntry_week_slot_key`(`schoolAccountId`, `weekNumber`, `dayOfWeek`, `periodNumber`),
    INDEX `ActivityPlanEntry_schoolAccountId_weekNumber_idx`(`schoolAccountId`, `weekNumber`),
    INDEX `ActivityPlanEntry_programCaseEntryId_idx`(`programCaseEntryId`),
    INDEX `ActivityPlanEntry_createdById_idx`(`createdById`),
    CONSTRAINT `ActivityPlanEntry_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ActivityPlanEntry_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `ActivityPlanEntry_programCaseEntryId_fkey` FOREIGN KEY (`programCaseEntryId`) REFERENCES `CaseEntry`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
