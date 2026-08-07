CREATE TABLE `TimetableConstraint` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `strength` VARCHAR(191) NOT NULL DEFAULT 'HARD',
    `title` VARCHAR(191) NULL,
    `valueInt` INTEGER NULL,
    `notes` TEXT NULL,
    `configJson` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TC_project_idx`(`projectId`),
    INDEX `TC_project_type_idx`(`projectId`, `type`),
    INDEX `TC_project_active_idx`(`projectId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableConstraintTeacher` (
    `id` VARCHAR(191) NOT NULL,
    `constraintId` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,

    INDEX `TCT_teacher_idx`(`teacherId`),
    UNIQUE INDEX `TCT_constraint_teacher_key`(`constraintId`, `teacherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableConstraintSubject` (
    `id` VARCHAR(191) NOT NULL,
    `constraintId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,

    INDEX `TCS_subject_idx`(`subjectId`),
    UNIQUE INDEX `TCS_constraint_subject_key`(`constraintId`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableConstraintClass` (
    `id` VARCHAR(191) NOT NULL,
    `constraintId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,

    INDEX `TCC_class_idx`(`classId`),
    UNIQUE INDEX `TCC_constraint_class_key`(`constraintId`, `classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableConstraintDay` (
    `id` VARCHAR(191) NOT NULL,
    `constraintId` VARCHAR(191) NOT NULL,
    `dayId` VARCHAR(191) NOT NULL,

    INDEX `TCD_day_idx`(`dayId`),
    UNIQUE INDEX `TCD_constraint_day_key`(`constraintId`, `dayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableConstraintPeriod` (
    `id` VARCHAR(191) NOT NULL,
    `constraintId` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,

    INDEX `TCP_period_idx`(`periodId`),
    UNIQUE INDEX `TCP_constraint_period_key`(`constraintId`, `periodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableConstraintSlot` (
    `id` VARCHAR(191) NOT NULL,
    `constraintId` VARCHAR(191) NOT NULL,
    `dayId` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,

    INDEX `TCL_slot_idx`(`dayId`, `periodId`),
    UNIQUE INDEX `TCL_constraint_slot_key`(`constraintId`, `dayId`, `periodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TimetableConstraint`
ADD CONSTRAINT `TC_project_fk`
FOREIGN KEY (`projectId`) REFERENCES `TimetableProject`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintTeacher`
ADD CONSTRAINT `TCT_constraint_fk`
FOREIGN KEY (`constraintId`) REFERENCES `TimetableConstraint`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintTeacher`
ADD CONSTRAINT `TCT_teacher_fk`
FOREIGN KEY (`teacherId`) REFERENCES `TimetableTeacher`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintSubject`
ADD CONSTRAINT `TCS_constraint_fk`
FOREIGN KEY (`constraintId`) REFERENCES `TimetableConstraint`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintSubject`
ADD CONSTRAINT `TCS_subject_fk`
FOREIGN KEY (`subjectId`) REFERENCES `TimetableSubject`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintClass`
ADD CONSTRAINT `TCC_constraint_fk`
FOREIGN KEY (`constraintId`) REFERENCES `TimetableConstraint`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintClass`
ADD CONSTRAINT `TCC_class_fk`
FOREIGN KEY (`classId`) REFERENCES `TimetableClass`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintDay`
ADD CONSTRAINT `TCD_constraint_fk`
FOREIGN KEY (`constraintId`) REFERENCES `TimetableConstraint`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintPeriod`
ADD CONSTRAINT `TCP_constraint_fk`
FOREIGN KEY (`constraintId`) REFERENCES `TimetableConstraint`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TimetableConstraintSlot`
ADD CONSTRAINT `TCL_constraint_fk`
FOREIGN KEY (`constraintId`) REFERENCES `TimetableConstraint`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;