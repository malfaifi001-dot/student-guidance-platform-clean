CREATE TABLE `TeacherSavedCurriculum` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `serviceSlug` VARCHAR(120) NOT NULL DEFAULT 'curriculum-distribution',
    `resourceType` VARCHAR(80) NOT NULL DEFAULT 'CURRICULUM_DISTRIBUTION',
    `subjectId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TeacherSavedCurriculum_owner_subject_semester_uq`(`ownerUserId`, `subjectId`, `semesterId`),
    INDEX `TeacherSavedCurriculum_schoolAccountId_ownerUserId_sortOrder_idx`(`schoolAccountId`, `ownerUserId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TeacherSavedCurriculum`
    ADD CONSTRAINT `TeacherSavedCurriculum_ownerUserId_fkey`
    FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TeacherSavedCurriculum`
    ADD CONSTRAINT `TeacherSavedCurriculum_schoolAccountId_fkey`
    FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
